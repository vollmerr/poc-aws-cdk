import * as cdk from "@aws-cdk/core";
import * as codebuild from "@aws-cdk/aws-codebuild";
import * as codepipeline from "@aws-cdk/aws-codepipeline";
import * as codepipelineActions from "@aws-cdk/aws-codepipeline-actions";
import * as pipelines from "@aws-cdk/pipelines";

import { StaticSiteStage } from "./static-site-stage";

const domain = "guestinternet.com";
const bucket = "11cms-staging";
const url = "https://11cms-staging.guestinternet.com/";
const final = "https://11cms-staging.guestinternet.com/portal-system/main/...";
const branch = "https://11cms-staging.guestinternet.com/portal-system/vollmerr-test-stuff/...";

export class PocAwsCdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const sourceArtifact = new codepipeline.Artifact();
    const cloudAssemblyArtifact = new codepipeline.Artifact();

    const sourceAction = new codepipelineActions.GitHubSourceAction({
      owner: "vollmerr",
      repo: "poc-aws-cdk",
      branch: "main",
      actionName: "Github",
      output: sourceArtifact,
      oauthToken: cdk.SecretValue.secretsManager("github-token"),
    });

    const synthAction = new pipelines.SimpleSynthAction({
      cloudAssemblyArtifact,
      sourceArtifact,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
        privileged: true,
      },
      installCommands: ["npm install"],
      buildCommands: ["npm run test", "npm run build"],
      synthCommand: "npx cdk synth",
    });

    const pipeline = new pipelines.CdkPipeline(this, "Pipeline", {
      cloudAssemblyArtifact,
      selfMutating: true,
      sourceAction,
      synthAction,
    });

    const deployStaging = new StaticSiteStage(this, "DeployStaging", {
      ...props,
      subdomain: "staging",
    });
    pipeline.addApplicationStage(deployStaging);

    const deployProd = new StaticSiteStage(this, "Deploy", props);
    pipeline.addApplicationStage(deployProd);
  }
}

// merge to main
//    deploy to staging/portal-system/main

// create/update branch
//    deploy to staging/portal-system/branch-name

// delete branch
//    delete staging/portal-system/branch-name
