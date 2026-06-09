import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as iam from 'aws-cdk-lib/aws-iam';

export class ChittaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ECR repository
    const repo = new ecr.Repository(this, 'ChittaApiRepo', {
      repositoryName: 'chitta-api',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Secrets
    const appSecrets = secretsmanager.Secret.fromSecretNameV2(this, 'ChittaSecrets', 'chitta/prod');

    // Lambda execution role
    const lambdaRole = new iam.Role(this, 'ChittaLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });
    appSecrets.grantRead(lambdaRole);
    repo.grantPull(lambdaRole);

    // Lambda function (Docker)
    const fn = new lambda.DockerImageFunction(this, 'ChittaApiLambda', {
      functionName: 'chitta-api',
      code: lambda.DockerImageCode.fromEcr(repo, { tagOrDigest: 'latest' }),
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      role: lambdaRole,
      environment: {
        ENVIRONMENT: 'production',
      },
    });

    // Load secrets into Lambda env from Secrets Manager at deploy time
    // (In practice, use addEnvironment or Parameter Store; shown here for clarity)

    // API Gateway HTTP API
    const api = new apigatewayv2.HttpApi(this, 'ChittaHttpApi', {
      apiName: 'chitta-api',
      corsPreflight: {
        allowOrigins: ['https://chitta.app', 'http://localhost:3000'],
        allowMethods: [apigatewayv2.CorsHttpMethod.ANY],
        allowHeaders: ['*'],
        allowCredentials: true,
      },
    });

    api.addRoutes({
      path: '/{proxy+}',
      methods: [apigatewayv2.HttpMethod.ANY],
      integration: new integrations.HttpLambdaIntegration('ChittaLambdaIntegration', fn),
    });

    // EventBridge cron — 7:00 AM IST = 1:30 AM UTC
    const morningBriefRule = new events.Rule(this, 'MorningBriefRule', {
      ruleName: 'chitta-morning-brief',
      schedule: events.Schedule.cron({ minute: '30', hour: '1' }),
    });

    morningBriefRule.addTarget(new targets.LambdaFunction(fn, {
      event: events.RuleTargetInput.fromObject({ type: 'morning_brief' }),
    }));

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', { value: api.apiEndpoint });
    new cdk.CfnOutput(this, 'EcrRepo', { value: repo.repositoryUri });
  }
}
