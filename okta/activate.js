const request = require('request')
const csv = require("csvtojson");
const fs = require('fs');
const { PromisePool }  = require('@supercharge/promise-pool')

console.log(`NODE_ENV=${process.env.NODE_ENV}`);

var secrets = null;

initializeSecrets().then(async data=>  {

    startMigration();
});

const activateuser = async (user) => {   
    

      activateuserOKTA(user)
     
    console.log(`createUser finished.`,data)
}  


const activateuserOKTA = async (user) => {
    var options = {
        'method': 'POST',
        'url': `https://dev-07818457-admin.okta.com/api/v1/users/${user.userId}/lifecycle/activate?sendEmail=true`,
        'headers': {
            'Content-Type': 'application/json',
            'Authorization': 'SSWS ' + secrets.token
        }
    };

    return new Promise(
        (resolve, reject) => {
            request(options, function (error, response) {
                if (error) {
                    console.log("activate user is failed with error ", error)
                    jsonRecord = {'firstName':  user.firstName, 'lastName': user.lastName , 'email': user.email,'login': user.login, 'userId': user.userId, 'status': error  }

                    csvData = `${jsonRecord.firstName},${jsonRecord.lastName},${jsonRecord.email},${jsonRecord.login},${jsonRecord.userId},${jsonRecord.status}\n`;


                    fs.appendFile('activate_result_error.csv', csvData, err => {
                        if (err) throw err;
                        //console.log('Data appended to file');
                      });

                    reject(error);
                }
                                
                else if(response.statusCode != 200){
                    console.log("activate user response code is not successful ")
                    jsonRecord = {'firstName':  user.firstName, 'lastName': user.lastName , 'email': user.email,'login': user.login, 'userId': user.userId, 'status': response.body  }
                    csvData = `${jsonRecord.firstName},${jsonRecord.lastName},${jsonRecord.email},${jsonRecord.login},${jsonRecord.userId},${jsonRecord.status}\n`;
                    //fs.writeFileSync('import_result.csv', csvData);

                    fs.appendFile('activate_result_error.csv', csvData, err => {
                        if (err) throw err;
                       // console.log('Data appended to file');
                      });

                      //reject("error");

                }
                    else{
                        console.log("activate user response code is successful ")
                        var result = JSON.parse(response.body)
    

                        jsonRecord = {'firstName':  user.firstName, 'lastName': user.lastName , 'email': user.email,'login': user.login, 'userId': user.userId , 'status': "Activated"  }
                        csvData = `${jsonRecord.firstName},${jsonRecord.lastName},${jsonRecord.email},${jsonRecord.login},${result.id},${jsonRecord.status}\n`;

                        fs.appendFile('activate_result_success.csv', csvData, err => {
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
    const usersfromFile=await csv().fromFile('./import_result_success.csv');
    const usersfromFileResult= await csv().fromFile('./activate_result_success.csv');
    
    const pendinguserstocreate = usersfromFile.filter(({ login }) =>
            !usersfromFileResult.some(exclude => exclude.login === login)
            );

    console.log(`datetime is `,Date.now())

    const { results, errors } = await PromisePool  
    .for(pendinguserstocreate)
    .withConcurrency(10)
    .process(async data => {
        console.log("processing record for user ");
        await activateuser(data);
    })


    
    console.log(`datetime is `,Date.now())
}

async function initializeSecrets(){
    secrets = {
        token :""
    };  
}

