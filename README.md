# wx-mp-api

wx-mp-api is an interface for node.js to access WeChat MP platform service. wx-mp-api utilize Bluebird to support promise.

##Install 

    npm install wx-mp-api

##Usage

Instantiate: 

    var WXAPI = require('wx-mp-api');
    var wxapi = new WXAPI({
        appId:"you-appid-get-from-WeChat-mp-account",
        secret:"you-secret-get-from-WeChat-mp-account"
        });


##Methods

    buildWXAuthURL(url,method)
    method could be 'sns_base' or 'sns_userinfo'

    requreUserInfo() 

    requreOpenId(code) 

    requestQRTicket 

    requestQR 

    createMenu 


If you need more interface, please let me know.
