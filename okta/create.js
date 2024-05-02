const request = require('request')
const csv = require("csvtojson");
const fs = require('fs');
const { PromisePool }  = require('@supercharge/promise-pool')

var secrets = null;


initializeSecrets().then(async data=>  {

    startMigration();
});

const createUser = async (user) => {   
    
    var oktaUserObject = {
        "profile": {
          "firstName":user.firstName,
          "lastName": user.lastName,
          "email": user.email,
          "login": user.login,
        }
      }

      createUserinAD(oktaUserObject)
     
    console.log(`createUser finished.`,data)
}   

const createUserinAD = async (oktaUserObject) => {
    var options = {
        'method': 'POST',
        'url': `https://dev-07818457-admin.okta.com/api/v1/users?activate=false`,
        'headers': {
            'Content-Type': 'application/json',
            'Authorization': 'SSWS ' + secrets.token
        },
        body: JSON.stringify(oktaUserObject)
    };

    return new Promise(
        (resolve, reject) => {
            request(options, function (error, response) {
                if (error) {
                    console.log("create user is failed with error ", error)
                    jsonRecord = {'firstName':  oktaUserObject.profile.firstName, 'lastName': oktaUserObject.profile.lastName , 'email': oktaUserObject.profile.email,'login': oktaUserObject.profile.login, 'status': error  }

                    csvData = `${jsonRecord.firstName},${jsonRecord.lastName},${jsonRecord.email},${jsonRecord.login},${jsonRecord.status}\n`;


                    fs.appendFile('import_result_error.csv', csvData, err => {
                        if (err) throw err;
                        //console.log('Data appended to file');
                      });

                    reject(error);
                }
                                
                else if(response.statusCode != 200){
                    console.log("create user response code is not successful ")
                    jsonRecord = {'firstName':  oktaUserObject.profile.firstName, 'lastName': oktaUserObject.profile.lastName , 'email': oktaUserObject.profile.email,'login': oktaUserObject.profile.login, 'status': response.body  }
                    csvData = `${jsonRecord.firstName},${jsonRecord.lastName},${jsonRecord.email},${jsonRecord.login},${jsonRecord.status}\n`;
                    //fs.writeFileSync('import_result.csv', csvData);

                    fs.appendFile('import_result_error.csv', csvData, err => {
                        if (err) throw err;
                       // console.log('Data appended to file');
                      });

                      //reject("error");

                }
                    else{
                        console.log("create user response code is successful ")
                        var result = JSON.parse(response.body)
    

                        jsonRecord = {'firstName':  oktaUserObject.profile.firstName, 'lastName': oktaUserObject.profile.lastName , 'email': oktaUserObject.profile.email,'login': oktaUserObject.profile.login, 'userId': result.id , 'status': "Created"  }
                        csvData = `${jsonRecord.firstName},${jsonRecord.lastName},${jsonRecord.email},${jsonRecord.login},${result.id},${jsonRecord.status}\n`;

                        fs.appendFile('import_result_success.csv', csvData, err => {
                            if (err) throw err;
                            //console.log('Data appended to file');
                          });

                        resolve(JSON.parse(response.body));
                    }
            });
        }
    );
}


var startMigration = async function(a, b) {
    const usersfromFile=await csv().fromFile('./users.csv');
    const usersfromFileResult= await csv().fromFile('./import_result_success.csv');
    
    const pendinguserstocreate = usersfromFile.filter(({ login }) =>
            !usersfromFileResult.some(exclude => exclude.login === login)
            );

    console.log(`datetime is `,Date.now())

    const { results, errors } = await PromisePool  
    .for(pendinguserstocreate)
    .withConcurrency(10)
    .process(async data => {
        console.log("processing record for user ");
        await createUser(data);
    })


    
    console.log(`datetime is `,Date.now())
}

async function initializeSecrets(){
    secrets = {
        token :""
    };  
}

