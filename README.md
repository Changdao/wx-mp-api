# wx-mp-api

[![npm](https://img.shields.io/badge/downloads-69%2Fmonth-green.svg)](https://www.npmjs.com/package/wx-mp-api)
[![License](https://img.shields.io/badge/license-MIT-gree.svg)](https://github.com/Changdao/wx-mp-api/blob/master/LICENSE)

wx-mp-api is an interface for node.js to access WeChat MP platform service. wx-mp-api utilize Bluebird to support promise.

##Install 

    npm install wx-mp-api

##Usage

Create instance: 
<pre>    /*
        create the WXAPI instance in your node.js server side. 
    */
    var WXAPI = require('wx-mp-api');
    var wxapi = new WXAPI({
        appId:"you-appid-get-from-WeChat-mp-account",
        secret:"you-secret-get-from-WeChat-mp-account",
	    mptoken:"you-token-set-for-wechat-mp",
        //option to control the wechat token refresh interval, default 1 hour. 
        //Equal or less than 0 indicate that the WXAPI disable automatic update token.
	    refreshInterval:3600000   
	    
        });
</pre>

An example for Express:
 <pre>
    /*
    * the Node.js/Express side. 
    */
    router.get('/wxconfig',function(req,res){
            var url = req.headers.referrer;
            res.send(wxapi.buildWXPageAPIConfig(url));
    }
 </pre>
 <pre>
    /*
    * the Client Side
    */
    $.get('/wxconfig',function(obj){
        wx.config(obj);
        wx.ready(function()
           {
               //alert('bind address ready');
               wx.openAddress(
                   {
                    //...
                   });
        });
    });
 </pre>
        


##Methods
###buildWXPageAPIConfig(url)
    While JavaScript in page try to call WeChat/Wexin bridge, 
    WeChat should verify the page privilege, this method build an object
    to pass to the front, then wx.config can accept it.
    return:
        {
            "noncestr": "1QNBVBx2u02AGQ0HO1lOeEuggQeYID2e",
            "timestamp": "1476328755",
            "signature": "03a4...",
            "appId": "******...",
            "jsApiList": ["checkJsApi", "openAddress"]
        }


###verifySite(signature,timestamp,nonce);
While binding the Web application to your WeChat MP account, WeChat will send a verfification request to the application, the application should verrify the request and response an echo str. This function is a simple encapsulation. 

Usage in Express:
<pre> router.get('/verify',function(req,res){
             return verifySite(req.query.signature,req.query.timestamp,req.query.nonce)?req.query.echostr:'';
	});
</pre>
    
###buildWXAuthURL(url,method)
method could be 'sns_base' or 'sns_userinfo'

###requreUserInfo()
Retrieve the user information.
    
###requreOpenId(code)
WeChat only pass "code" as a query param to web app, app should retrieve the user infomation from WeChat through WeChat service reqeust.

###requestQRTicket
This method is used by requestQR.

###requestQR
Sometime, app want to generate QR code, WeChat provice a service to help it. Call this function to generate QR through WeChat service.
    
###createMenu
WeChat MP support customized menu, you can create menu through this function in your route function.

## Todo:
1. to support more interfaces

<strong>If you need more interface, please let me know.</strong>
