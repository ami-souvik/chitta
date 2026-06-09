#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { ChittaStack } from '../lib/infra-stack';

const app = new cdk.App();
new ChittaStack(app, 'ChittaStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? 'ap-south-1',
  },
});
