import * as cdk from "@aws-cdk/core";
import * as route53 from "@aws-cdk/aws-route53";

import { StaticSiteStack } from "./static-site-stack";

export type PocAwsCdkStageProps = {
  /** name of the domain being distributed to */
  domainName: string;
  /** zone distribution is hosted in  */
  zone: route53.IHostedZone;
} & cdk.StageProps;

export class PocAwsCdkStage extends cdk.Stage {
  public readonly StackName: string;
  constructor(
    scope: cdk.Construct,
    targetEnv: string,
    props: PocAwsCdkStageProps
  ) {
    super(scope, targetEnv, props);

    new StaticSiteStack(this, `app-one-${targetEnv}`, {
      ...props,
      targetEnv,
      targetApp: "app-one",
    });

    new StaticSiteStack(this, `app-two-${targetEnv}`, {
      ...props,
      targetEnv,
      targetApp: "app-two",
    });
  }
}
