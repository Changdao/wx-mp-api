/**
 * WXAPI API for WeChat/Weixin MP Deleopment
 * Author: Changdao
 */
var https = require('https');
var crypto = require('crypto');
var Stream = require('stream').Transform;
var Promise = require('bluebird');


/**
 * WXAPI includes some interfaces important for WeChat MP development.
 * At default, WXAPI will update token at once, then update token every 1 hour.
 * If you dont' need it, you can pass an option:refreshInterval with zero or less, for example:
 * var wxapi = new WXAPI({refreshInterval:0,...});
 * @param options
 * @constructor
 */
var WXAPI = function (options) {
    var createUpdateWXToken = function (owner) {
        return function () {
            owner.refreshToken(owner.refreshJS_api_ticket);
        }
    };
    this.appId = options.appId;
    this.secret = options.secret;
    this.mptoken = options.mptoken;
    this.updateToken = createUpdateWXToken(this);
    options.refreshInterval = options.refreshInterval||3600000;
    if(options.refreshInterval>0)
    {
        setInterval(this.updateToken, options.refreshInterval);
        this.updateToken();
    }

};

/**
* An utitily function to verify the web site while binding to wechat mp.
*/

WXAPI.prototype.verifySite=function(signature,timestamp,nonce){
    var str = [this.mptoken, timestamp, nonce].sort().join('');
    var signatureCalc = crypto.createHash('sha1').update(str).digest('hex');
    return signature === signatureCalc;
};

WXAPI.prototype.generateNonceString = function(length){
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var maxPos = chars.length;
    var noceStr = "";
    for (var i = 0; i < (length || 32); i++) {
        noceStr += chars.charAt(Math.floor(Math.random() * maxPos));
    }
    return noceStr;
};

WXAPI.prototype.wxShaSign=function(param){
    var querystring = Object.keys(param).filter(function (key) {
        return param[key] !== undefined && param[key] !== '' && ['pfx', 'partner_key', 'sign', 'key'].indexOf(key) < 0;
    }).sort().map(function (key) {
        return key + '=' + param[key];
    }).join("&");

    return crypto.createHash('sha1').update(querystring).digest('hex');
};


/**
 * buildWXPageAPIConfig
 * @param url
 * */
WXAPI.prototype.buildWXPageAPIConfig = function(url){
    var wxConfig = {
        noncestr: this.generateNonceString(),
        timestamp: Math.floor(Date.now() / 1000) + "",
        url: url,
        jsapi_ticket: this.jsapi_ticket
    };
    wxConfig.signature = this.wxShaSign(wxConfig);
    wxConfig.nonceStr = wxConfig.noncestr;
    wxConfig.appId = this.appId;
    wxConfig.jsApiList = ['checkJsApi', 'openAddress', 'onMenuShareTimeline',
        'onMenuShareAppMessage',
        'onMenuShareQQ',
        'onMenuShareWeibo',
        'onMenuShareQZone'];
    //wxConfig.jsapi_ticket = undefined;
    return wxConfig;
};

/**
 * return the url to be authorized by wechat.
 * @param url
 * @param authtype sns_base sns_userinfo
 * @returns {string}
 */
WXAPI.prototype.buildWXAuthURL=function(url,authtype){
  return "https://open.weixin.qq.com/connect/oauth2/authorize?appid=" +this.appId
        +"&redirect_uri=" +encodeURIComponent(url)
        +"&response_type=code"
        +"&response_type=code&scope="+authtype
        +"&state=STATE"
        +"#wechat_redirect";
};

/**
 * Refresh JS API TICKET
 * @param token
 * Notice: this method is Non-Promise
 */
WXAPI.prototype.refreshJS_api_ticket = function (token,owner) {

    https.get('https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=' + token + '&type=jsapi', (r)=> {
        r.on('data', (chunk)=> {
            var text = chunk.toString('utf8');
            var obj = JSON.parse(text);

            owner.jsapi_ticket = obj.ticket;

        })
    }).on('error', (e)=> {
        console.error(e);
    });
};
/**
 * refresh WeChat access token.
 * @param callback
 * Non-Promise
 */
WXAPI.prototype.refreshToken = function (callback) {
    var that = this;
    https.get('https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=' + this.appId +
        '&secret=' + this.secret,
        (r) => {
            var tokstr= '';
            r.on('data', (chunk) => {
                tokstr+= chunk.toString('utf8');
            });
            r.on('end',()=>{
                var obj = JSON.parse(tokstr);
                that.accessToken = obj.access_token;
                if (callback)callback(that.accessToken,that);
            })
        }
    ).on('error', (e)=> {

    });
};
/**
 * Retrieve user openId per code.
 * @param code
 * @param onData
 */
WXAPI.prototype.requestOpenId = function (code) {
    var that = this;
    return new Promise(function (resolve, reject) {
        return https.get('https://api.weixin.qq.com/sns/oauth2/access_token?appid=' + that.appId +
            '&secret=' + that.secret +
            '&code=' + code +
            '&grant_type=authorization_code', (r) => {

            r.on('data', (d) => {
                var text = d.toString('utf8');
                var obj = JSON.parse(text);
                resolve(obj.openid);
            });
            r.on('error', (e)=> {
                reject(e);
            });
        });
    });
};
/**
 * To request non subscribed user access token.
 * @param code
 */
WXAPI.prototype.requestNonSubAccessToken = function(code){
    var that = this;
    return new Promise(function (resolve, reject) {
        return https.get('https://api.weixin.qq.com/sns/oauth2/access_token?appid=' + that.appId +
            '&secret=' + that.secret +
            '&code=' + code +
            '&grant_type=authorization_code', (r) => {

            r.on('data', (d) => {
                var text = d.toString('utf8');
                var obj = JSON.parse(text);
                resolve(obj);
            });
            r.on('error', (e)=> {
                reject(e);
            });
        });
    });
};
/**
 * Request Non-Subscribed User Infomation.
 * @param openid
 * @param callback
 */
WXAPI.prototype.requestNonSubUserInfo=function(obj){
    return new Promise(function (resolve, reject) {
        var url = ' https://api.weixin.qq.com/sns/userinfo?access_token='+obj.access_token+'&openid='+obj.openid+'&lang=zh_CN ';
        https.get(url,
            (r)=> {
                r.on('data', (d)=> {
                    var text = d.toString('utf8');
                    var obj = JSON.parse(text);
                    resolve(obj);
                });
                r.on('error', (err)=> {
                    reject(err);
                });
            });
    });
};
/**
 * Retrieve User Info.
 * @param openid
 */
WXAPI.prototype.requestUserInfo = function (openid) {
    var that = this;
    return new Promise(function (resolve, reject) {
        var url = 'https://api.weixin.qq.com/cgi-bin/user/info?access_token=' + that.accessToken + '&openid=' + openid + '&lang=zh_CN ';
        https.get(url,
            (r)=> {
                r.on('data', (d)=> {
                    var text = d.toString('utf8');
                    var obj = JSON.parse(text);
                    resolve(obj);
                });
                r.on('error', (err)=> {
                    reject(err);
                });
            });
    });
};

/**
 * Request WeChat QRCode ticket.
 * @param id
 * @param callback
 * @param retryCount
 */
WXAPI.prototype.requestQRTicket = function (aid, aretryCount) {
    var that = this;
    var retryRequestQRTicket = function (id, theretryCount, done, fail) {
        var retryCount = theretryCount;

        if (retryCount) {
            retryCount--;
            if (retryCount < 0) {
                if (fail)fail(new Error("OUT OF RETRY COUNT"));
                return;
            }
        }
        var ticket = '';
        var reqJSON = {"action_name": "QR_LIMIT_SCENE", "action_info": {"scene": {"scene_id": id}}};

        var postData = JSON.stringify(reqJSON);

        var options = {
            hostname: 'api.weixin.qq.com',
            port: 443,
            path: '/cgi-bin/qrcode/create?access_token=' + that.accessToken,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        var optionsString = JSON.stringify(options);

        var areq = https.request(options, (res) => {
            res.setEncoding('utf8');
            res.on('error', (err)=> {
                reject(err);
            });
            res.on('readable', ()=> {
            });
            res.on('data', (chunk) => {
                ticket += chunk.toString('utf8');
            });
            res.on('end', () => {
                var ticketObj = JSON.parse(ticket);
                if (ticketObj.errcode) {
                    that.refreshToken(function () {
                        retryRequestQRTicket(id, retryCount, done, fail);
                    });
                }
                else if (done)done(ticketObj);
            })
        });

        areq.on('error', (e) => {
            if (fail)fail(e);
        });

        // write data to request body
        areq.write(postData);
        areq.end();
    };

    return new Promise(function (resolve, reject) {
        retryRequestQRTicket(aid, aretryCount
            , (obj)=> {
                resolve(obj);
            }
            , (err)=> {
                reject(err);
            });
    });

};
/**
 * Request WeChat to generate QRCode.
 * @param ticket
 * @param callback
 */
WXAPI.prototype.requestQR = function (ticket, callback) {
    return new Promise(function (resolve, reject) {
        var data = new Stream();
        https.get('https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=' + encodeURIComponent(ticket),
            (r) => {
                r.on('data', (chunk) => {
                    data.push(chunk);
                });
                r.on('end', ()=> {
                    resolve(data.read());
                });
                r.on('error', (err)=> {
                    reject(err);
                })
            }
        ).on('error', (e)=> {
            console.error(e);
            reject(e);
        });
    });

};
/**
 * Create customized menu in WeChat public/service account.
 * @param postData
 */
WXAPI.prototype.createMenu = function (postData) {
    var options = {
        hostname: 'api.weixin.qq.com',
        port: 443,
        path: '/cgi-bin/menu/create?access_token=' + this.accessToken,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    var areq = https.request(options, (res) => {

        res.setEncoding('utf8');
        res.on('data', (chunk) => {
        });
        res.on('end', () => {
        })
    });

    areq.on('error', (e) => {
    });

    // write data to request body
    areq.write(postData);
    areq.end();
};

/**
* Send template message
*/
/**
 * 发送模板消息
 *
 * @param openId
 * @param content
 * @param templateId
 * @param url
 * @returns {bluebird}
 */
WXAPI.prototype.sendTemplateMessage = function( openId , content , templateId , url ) {

    var that = this;
    //r9mnGjRQ3KqLCAwalXFRiYiiAmYohOZAlB6JqySonQA
    return new Promise( function( resolve , reject ) {
        var data = JSON.stringify( {
            "touser": openId ,
            "template_id": templateId ,
            "url": url ,
            "data": content
        } );

        //https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=ACCESS_TOKEN
        var options = {
            hostname: "api.weixin.qq.com" ,
            port: 443 ,
            path: "/cgi-bin/message/template/send?access_token=" + that.accessToken ,
            method: "POST" ,
            headers: {
                "Content-Type": "application/json" ,
                "Content-Length": Buffer.byteLength( data )
            }
        };

        var areq = https.request( options , ( res ) => {
            res.setEncoding( "utf8" );
            var result = "";
            res.on( "data" , ( chunk ) => {
                result += chunk.toString( "utf8" );
                console.log( `BODY: ${chunk}` );
            } );
            res.on( "end" , () => {
                var obj = JSON.parse( result );
                if( obj.errcode )reject( obj );
                else
                    resolve( obj );
            } );
        } );

        areq.on( "error" , ( e ) => {
            reject( e );
            console.log( `problem with request: ${e.message}` );
        } );

        // write data to request body
        areq.write( data );
        areq.end();
    } );
};

module.exports = WXAPI;
