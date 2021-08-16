import * as cdk from "@aws-cdk/core";

import { StaticSiteConstruct } from "./static-site-construct";

export class StaticSiteStack extends cdk.Stack {
  public readonly StackName: string;
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    new StaticSiteConstruct(this, "StaticSite");
  }
}
