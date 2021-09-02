import * as cdk from '@aws-cdk/core';
import * as bk from '@service-victoria/buildkite-cdk';
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';
import { CodePipeline, CodePipelineSource, ManualApprovalStep, ShellStep } from '@aws-cdk/pipelines';
import { Stage } from '@aws-cdk/core';
import { MsessaSandboxCdkAppStack } from './msessa-sandbox-cdk-app-stack';
import { BuildkiteCdkPipeline } from '@service-victoria/buildkite-cdk';

// export class MsessaSandboxCdkAppPipelineStack extends cdk.Stack {
//   constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
//     super(scope, id, props);

//     const pipeline = new CodePipeline(this, 'CdkPipeline', {
//       synth: new ShellStep('synth', {
//         input: CodePipelineSource.gitHub('service-victoria/msessa-sandbox-cdk-app', 'main'),
//         commands: ['npm ci', 'npm run build', 'npx cdk synth'],
//       })
//     })

//     const dev = new Stage(this, 'DevStage')
//     new MsessaSandboxCdkAppStack(dev, 'MsessaSandboxCdkAppStackDev')
//     pipeline.addStage(dev);

//     const prod = new Stage(this, 'ProdStage')
//     new MsessaSandboxCdkAppStack(prod, 'MsessaSandboxCdkAppStackProd')
//     pipeline.addStage(prod, {
//       pre: [
//         new ManualApprovalStep('prod-deploy', {
//           comment: 'are you sure?'
//         })
//       ]
//     });
//   }
// }


export class MsessaSandboxCdkAppPipelineStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pipeline = new BuildkiteCdkPipeline(this, 'CdkPipeline', {
      apiTokenSecret: secretsmanager.Secret.fromSecretNameV2(this, 'ApiToken', 'buildkite-api-token'),
      organization: 'service-victoria',
      repositoryUrl: 'git@github.com:msessa/msessa-sandbox-cdk-app.git',
      synth: new ShellStep('synth', {
        commands: ['npm ci', 'npm run build', 'npx cdk synth'],
      })
    })

    const dev = new Stage(this, 'DevStage')
    new MsessaSandboxCdkAppStack(dev, 'MsessaSandboxCdkAppStackDev')
    pipeline.addStage(dev);

    const prod = new Stage(this, 'ProdStage')
    new MsessaSandboxCdkAppStack(prod, 'MsessaSandboxCdkAppStackProd')
    pipeline.addStage(prod, {
      pre: [
        new ManualApprovalStep('prod-deploy', {
          comment: 'are you sure?'
        })
      ]
    });
  }
}