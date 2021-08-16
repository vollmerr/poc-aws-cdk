import * as cdk from "@aws-cdk/core";

import { StaticSiteStack, StaticSiteStackProps } from "./static-site-stack";

export type StaticSiteStageProps = StaticSiteStackProps & cdk.StackProps;

export class StaticSiteStage extends cdk.Stage {
  public readonly StackName: string;
  constructor(scope: cdk.Construct, id: string, props: StaticSiteStageProps) {
    super(scope, id, props);

    new StaticSiteStack(this, "StaticSite", props);
  }
}
