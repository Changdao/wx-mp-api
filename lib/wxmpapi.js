/**
 * WXAPI 微信公众号相关API
 * Author: Changdao
 */
var https = require('https');
var crypto = require('crypto');
var Stream = require('stream').Transform;
var Promise = require('bluebird');


/**
 * WXAPI includes some interfaces important for WeChat MP development. 
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
    setInterval(this.updateToken, options.refreshInterval||3600000);
    this.updateToken();
};
/**
* An utitily function to verify the web site right and wechat mp is right.
*/

WXAPI.prototype.verifySite=function(signature,timestamp,nonce){
    var str = [this.mptoken, timestamp, nonce].sort().join('');
    var signatureCalc = crypto.createHash('sha1').update(str).digest('hex');
    return signature === signatureCalc;
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
 * 刷新JS  API TICKET
 * @param token
 * 不是Promise
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
 * 刷新微信服务访问令牌
 * @param callback
 * 不是Promise
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
 * 根据用户code获取用户openid
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
 * 根据用户openid获取用户身份
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

WXAPI.prototype.requestUserInfo = function (openid) {
    var that = this;
    return new Promise(function (resolve, reject) {
        var url = ' https://api.weixin.qq.com/cgi-bin/user/info?access_token=' + that.accessToken + '&openid=' + openid + '&lang=zh_CN ';
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
 * 申请二维码票据
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
 * 申请二维码
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
 * 创建公众服务号菜单
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


module.exports = WXAPI;
