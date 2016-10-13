# wx-mp-api

wx-mp-api is an interface for node.js to access WeChat MP platform service. wx-mp-api utilize Bluebird to support promise.

##Install 

    npm install wx-mp-api

##Usage

Create instance: 

    var WXAPI = require('wx-mp-api');
    var wxapi = new WXAPI({
        appId:"you-appid-get-from-WeChat-mp-account",
        secret:"you-secret-get-from-WeChat-mp-account",
	    mptoken:"you-token-set-for-wechat-mp",
	    refreshInterval:3600000   //option to control the wechat token refresh interval, default 1 hour. Equal or less than 0 indicate that the WXAPI disable automatic update token.
        });


##Methods
###<strong>buildWXPageAPIConfig(url)</strong>
    产生网页授权配置JSON对象，微信网页访问微信功能需要用到。
    return:
    <pre>
        {
            "noncestr": "1QNBVBx2u02AGQ0HO1lOeEuggQeYID2e",
            "timestamp": "1476328755",
            "signature": "03a4...",
            "appId": "******...",
            "jsApiList": ["checkJsApi", "openAddress"]
        }

    </pre>

###<strong>verifySite(signature,timestamp,nonce);</strong>
    微信设置开发配置时，需要应用进行确认操作，verifySite简单封装了排序和加密处理。
    Usage:
        router.get('/verify',function(req,res){
             return verifySite(req.query.signature,req.query.timestamp,req.query.nonce)?req.query.echostr:'';
	});
    
###<strong>buildWXAuthURL(url,method)</strong>
    method could be 'sns_base' or 'sns_userinfo'

###requreUserInfo()
    Retrieve the user information.
    
###requreOpenId(code)
    WeChat only pass "code" as a query param to web app, app should retrieve the 
    user infomation from WeChat through WeChat service reqeust.

###requestQRTicket
    Sometime, app want to generate QR code, WeChat provice a service to help it.
    This method is used by requestQR.

###requestQR
    Generate QR through WeChat service.
    
###createMenu
    WeChat MP support customized menu, this is the interface to create it.

## Todo:
   ### support more interfaces
       If you need more interface, please let me know.
