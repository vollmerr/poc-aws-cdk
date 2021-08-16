import * as cdk from "@aws-cdk/core";

import {
  StaticSiteConstruct,
  StaticSiteConstructProps,
} from "./static-site-construct";

export type StaticSiteStackProps = StaticSiteConstructProps & cdk.StackProps;

export class StaticSiteStack extends cdk.Stack {
  public readonly StackName: string;
  constructor(scope: cdk.Construct, id: string, props: StaticSiteStackProps) {
    super(scope, id, props);

    new StaticSiteConstruct(this, "StaticSite", props);
  }
}
