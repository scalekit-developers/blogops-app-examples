import { ScalekitClient } from '@scalekit-sdk/node';
// Initialize the SDK client
const scalekit = new ScalekitClient(
  'https://rudimentary-havapoo.scalekit.cloud',
  'skc_32080745455485442',
  'test_lmwtJ3j12rhKJSo2qLXypcb7G0mghlvuwT5k0xMZjzelFORBhdgt8jdhjh7UBWc6'
);

const options = {};

// Organization Name: Tesla
options['organizationId'] = 'org_33247113399762954';
options['connectionId'] = 'conn_34551889920000815';

// Organization Name: Test Organization
options['connectionId'] = 'conn_32673595092107829';

const authorizationURL = scalekit.getAuthorizationUrl(
  'http://localhost:3001/callback',
  options
);

console.log(authorizationURL);
