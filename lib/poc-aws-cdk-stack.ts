import * as cdk from "@aws-cdk/core";
import * as codebuild from "@aws-cdk/aws-codebuild";
import * as codepipeline from "@aws-cdk/aws-codepipeline";
import * as codepipelineActions from "@aws-cdk/aws-codepipeline-actions";
import * as pipelines from "@aws-cdk/pipelines";

import { StaticSiteStage } from "./static-site-stage";

export class PocAwsCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const sourceArtifact = new codepipeline.Artifact();
    const cloudAssemblyArtifact = new codepipeline.Artifact();

    const pipeline = new pipelines.CdkPipeline(this, "Pipeline", {
      cloudAssemblyArtifact,
      selfMutating: true,
      sourceAction: new codepipelineActions.GitHubSourceAction({
        owner: "vollmerr",
        repo: "poc-aws-cdk",
        branch: "main",
        actionName: "Github",
        output: sourceArtifact,
        oauthToken: cdk.SecretValue.secretsManager("github-token"),
      }),
      synthAction: new pipelines.SimpleSynthAction({
        cloudAssemblyArtifact,
        sourceArtifact,
        environment: {
          buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
          privileged: true,
        },
        installCommands: ["npm install"],
        buildCommands: ["npm run test", "npm run build"],
        synthCommand: "npx cdk synth",
      }),
    });

    // const deployStaging = new StaticSiteStage(this, "DeployStaging", {
    //   ...props,
    //   domainName: "staging.vollmerr.com",
    // });
    // pipeline.addApplicationStage(deployStaging);

    const deployProd = new StaticSiteStage(this, "DeployProd", {
      ...props,
      domainName: "vollmerr.com",
    });
    pipeline.addApplicationStage(deployProd);
  }
}
