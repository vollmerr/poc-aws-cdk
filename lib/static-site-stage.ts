import * as cdk from "@aws-cdk/core";

import { StaticSiteStack } from "./static-site-stack";

export class StaticSiteStage extends cdk.Stage {
  public readonly StackName: string;
  constructor(scope: cdk.Construct, id: string, props?: cdk.StageProps) {
    super(scope, id, props);
    new StaticSiteStack(this, "StaticSite");
  }
}
