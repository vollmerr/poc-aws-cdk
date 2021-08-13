import * as cdk from '@aws-cdk/core';

export class StaticSiteStack extends cdk.Stack {
  public readonly StackName: string;
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
  }
} 
