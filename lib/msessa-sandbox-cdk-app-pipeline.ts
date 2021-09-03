import * as cdk from '@aws-cdk/core';
import * as bk from '@service-victoria/buildkite-cdk';
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';
import { CodePipeline, CodePipelineSource, ManualApprovalStep, ShellStep } from '@aws-cdk/pipelines';
import { Stage } from '@aws-cdk/core';
import { MsessaSandboxCdkAppStack } from './msessa-sandbox-cdk-app-stack';
import { engine, stepfactory } from '@service-victoria/buildkite-cdk';

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

    const pipeline = new engine.BuildkiteCdkPipeline(this, 'CdkPipeline', {
      apiTokenSecret: secretsmanager.Secret.fromSecretNameV2(this, 'ApiToken', 'buildkite-api-token'),
      organization: 'service-victoria',
      repositoryUrl: 'git@github.com:msessa/msessa-sandbox-cdk-app.git',
      synth: new stepfactory.core.BuildkiteCommandStep('synth', {
        commands: ['npm ci', 'npm run build', 'npx cdk synth'],
        plugins: [
          new stepfactory.plugins.AwsSmBuildkitePlugin({
            env: {
              GITHUB_TOKEN: {
                'secret-id': 'common/github/credentials/sv-platform-cicd-rw',
                'json-key': '.token',
              },
            },
          }),
          new stepfactory.plugins.PrivateNpmBuildkitePlugin({
            env: 'GITHUB_TOKEN',
            registry: '//npm.pkg.github.com/',
            'scope-package-registries': [
              {
                registry: 'https://npm.pkg.github.com/',
                scope: '@service-victoria',
              },
            ],
          }),
          new stepfactory.plugins.DockerBuildkitePlugin({
            image: 'node:14.17',
          }),
        ],
      }),
    });

    const dev = new Stage(this, 'DevStage', {
      env: {
        account: '026506256920',
        region: 'ap-southeast-2',
      },
    });
    new MsessaSandboxCdkAppStack(dev, 'MsessaSandboxCdkAppStackDev');
    pipeline.addStage(dev, {
      commandPlugins: [
        new stepfactory.plugins.AwsAssumeRoleBuildkitePlugin({
          role: 'arn:aws:iam::260078026956:role/cross-account-deployment-role',
        }),
        new stepfactory.plugins.DockerBuildkitePlugin({
          image: 'node:14.17',
        }),
      ],
    });

    const prod = new Stage(this, 'ProdStage');
    new MsessaSandboxCdkAppStack(prod, 'MsessaSandboxCdkAppStackProd');
    pipeline.addStage(prod, {
      commandPlugins: [
        new stepfactory.plugins.DockerBuildkitePlugin({
          image: 'node:14.17',
        }),
      ],
      pre: [
        new ManualApprovalStep('prod-deploy', {
          comment: 'are you sure?',
        }),
      ],
    });
  }
}