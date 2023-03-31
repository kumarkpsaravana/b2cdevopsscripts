const request = require('request')
const {createToken} = require('./getToken')
const pub = require('fs').readFileSync('./public1.pem').toString()
const priv = require('fs').readFileSync('./private1.pem').toString()
const dotenv = require('dotenv');
const path = require('path');
const csv = require("csvtojson");
const crypto = require('crypto');
const fs = require('fs');
const readline = require('readline');
const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");


console.log(`NODE_ENV=${process.env.NODE_ENV}`);

const data = [
    //{firstName: 'John Doe', age: 30, job: 'Developer'},
    //{name: 'Jane Doe', age: 28, job: 'Designer'}
    //                    csvData = data.map(d => `${d.firstName},${d.lastName},${d.email},${d.username},${d.mobile},${d.userType},${response.body}\n`).join('');

  ];

dotenv.config({
    path: path.resolve(__dirname, `${process.env.NODE_ENV}.env`)
});

const credential = new DefaultAzureCredential();

var secrets = null;
var config = null;
const vaultName = process.env["AZURE_KEY_VAULT_NAME"];
const url = `https://${vaultName}.vault.azure.net`;
const client = new SecretClient(url, credential);

initializeSecrets().then(data=>{

    config = {        
        "appid":secrets.b2cUsermanagementAppId,
        "tenantId":secrets.b2cTenantId,
        "x5t":secrets.b2cUsermanagementAppX5T, 
        "url":"https://login.microsoftonline.com/"+secrets.b2cTenantId+"/oauth2/token",
        "privateKey": secrets.b2cUsermanagementAppPrivateKey
    }

    console.log("Secrets retrived and configured successfully")

    startMigration();
});

const getAuthToken = async function () {
    var jwt = await createToken(config).catch((error) => {
        return error
        }
    )

    var options = {
        'method': 'POST',
        'url': `https://login.microsoftonline.com/${secrets.b2cTenantDomain}/oauth2/v2.0/token`,
        'headers': {
            'Content-Type': 'application/x-www-form-encoded'
        },
        form: {
            'grant_type': 'client_credentials',
            'scope': 'https://graph.microsoft.com/.default',
            "client_id": config.appid,
            "client_assertion_type": 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
            "client_assertion": jwt
        }
    };

    return new Promise(
        (resolve, reject) => {
            request(options, function (error, response) {
                if (error) {
                    reject(error);
                }
                resolve(JSON.parse(response.body));
            });
        }
    );
}

const createUser = async (user) => {   
    var password = generatePassword();   
    var aadUserObject = {
        "displayName": user.firstName,
        "surname": user.lastName,
        "givenName": user.firstName,
        "mobilePhone": user.mobile,
        "identities": [{
            "signInType": "userName",
            "issuer": secrets.b2cTenantDomain,
            "issuerAssignedId": user.username
        },
        {
            "signInType": "emailAddress",
            "issuer": secrets.b2cTenantDomain,
            "issuerAssignedId": user.email
        }],
        "mail": user.email,
        "passwordProfile": {
            "password": password,
            "forceChangePasswordNextSignIn": false
        },
        "otherMails": [user.email],
        "passwordPolicies": "DisablePasswordExpiration,DisableStrongPassword"
    }

    aadUserObject[secrets.b2cUserTypeAttribute] = user.userType;
    aadUserObject[secrets.requiresMigrationAttributeName] = true;
    aadUserObject[secrets.existingUserAttributeName] = true;

    var accessToken = await getAuthToken();

    var userAdDetails = await createUserinAD(accessToken.access_token, aadUserObject)        
    console.log(`createUser finished.`,data)
}   

const createUserinAD = async (accessToken, aadUserObject) => {
    var options = {
        'method': 'POST',
        'url': `https://graph.microsoft.com/v1.0/users`,
        'headers': {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken
        },
        body: JSON.stringify(aadUserObject)
    };

    return new Promise(
        (resolve, reject) => {
            request(options, function (error, response) {
                if (error) {
                    console.log("create user is failed with error ", response.body)
                    //csvData = data.map(d => `${d.name},${d.age},${d.job}\n`).join('');
                    csvData = data.map(userData => `${response.request.body},${response.body}\n`).join('');
                    

                    userData = JSON.parse(response.request.body)        
                
                    console.log("userData ",userData)

                    jsonRecord = {'firstName':  userData.givenName, 'lastName': userData.surname , 'email': userData.otherMails,'username': userData.identities[0].issuerAssignedId,'mobile': userData.mobilePhone, 'status': response.body  }

                    console.log("jsonRecord ",userData.givenName)



                    csvData = `${jsonRecord.firstName}, ${jsonRecord.lastName},  ${jsonRecord.email},  ${jsonRecord.username}, ${jsonRecord.mobile}, ${jsonRecord.status}\n`;
                    //fs.writeFileSync('import_result.csv', csvData);

                    fs.appendFile('import_result.csv', csvData, err => {
                        if (err) throw err;
                        console.log('Data appended to file');
                      });

                    reject(error);
                }
                                
                else if(response.statusCode != 201){
                    console.log("create user response code is not successful ",response.body)

                    console.log("userData ",response.request.body)


                    userData = JSON.parse(response.request.body)        
                
                    console.log("userData ",userData)

                    jsonRecord = {'firstName':  userData.givenName, 'lastName': userData.surname , 'email': userData.otherMails,'username': userData.identities[0].issuerAssignedId,'mobile': userData.mobilePhone, 'status': response.body  }

                    console.log("jsonRecord ",userData.givenName)



                    csvData = `${jsonRecord.firstName}, ${jsonRecord.lastName},  ${jsonRecord.email},  ${jsonRecord.username}, ${jsonRecord.mobile}, ${jsonRecord.status}\n`;
                    //fs.writeFileSync('import_result.csv', csvData);

                    fs.appendFile('import_result.csv', csvData, err => {
                        if (err) throw err;
                        console.log('Data appended to file');
                      });

                }
                    else{
                        console.log('create user response code ',response.body)
                        resolve(JSON.parse(response.body));
                    }


                
                
            });
        }
    );
}

const generatePassword = (
    length = 20,
    wishlist = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~!@-#$'
  ) =>
    Array.from(crypto.randomFillSync(new Uint32Array(length)))
      .map((x) => wishlist[x % wishlist.length])
      .join('')

var startMigration = async function(a, b) {
    const usersfromFile=await csv().fromFile('./users.csv');

    console.log(`datetime is `,Date.now())

    usersfromFile.forEach(async element  => {
       // await createUser(element);

       console.log('status for processing record is ', element.status);

        
        if(!element.username || element.username.length == 0)
        {
            console.log("username is mandatory. please provide the valid username ");
        }
      /*  else if(!element.status || element.status!="success")
        {
        console.log("processing record for user ");
        createUser(element);
        } */
        else
        {
            console.log("processing record for user ");
            createUser(element);
        }
      });
    console.log(`datetime is `,Date.now())
}

async function initializeSecrets(){
    secrets = {
        b2cUsermanagementAppId: (await client.getSecret(`EndGame-${process.env["ENVIRONMENT"]}-B2C-UserManagementAppId`)).value,
        b2cTenantId: (await client.getSecret(`EndGame-${process.env["ENVIRONMENT"]}-B2CTenantId`)).value,
        b2cTenantDomain: (await client.getSecret(`EndGame-${process.env["ENVIRONMENT"]}-B2CTenant`)).value,
        b2cUsermanagementAppX5T: (await client.getSecret(`EndGame-${process.env["ENVIRONMENT"]}-B2C-UserManagementApp-X5T`)).value,
        b2cUsermanagementAppPrivateKey: (await client.getSecret(`EndGame-${process.env["ENVIRONMENT"]}-B2C-UserManagementApp-Certificate`)).value,
        b2cUserTypeAttribute: (await client.getSecret(`EndGame-${process.env["ENVIRONMENT"]}-B2C-Usertype-Attribute`)).value,
        existingUserAttributeName: (await client.getSecret(`EndGame-${process.env["ENVIRONMENT"]}-B2C-ExistingUser-Attribute`)).value,
        requiresMigrationAttributeName: (await client.getSecret(`EndGame-${process.env["ENVIRONMENT"]}-B2C-RequiresMigration-Attribute`)).value,
    };  
}

