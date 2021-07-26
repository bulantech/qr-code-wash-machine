var _lnwl;(function(){var _d=document;var _l=window.location;var _n=window.navigator;var _s=window.screen;var _u=undefined;var _euc=function(d){return encodeURIComponent(d);};var __c=function(){var _c=this;var _ka="____lnwa";var _kb="____lnwb";var _kc="____lnwc";var _kz="____lnwz";var cda=null;var cdb=null;var cdc=null;var cdz=null;var _t=Math.round((new Date()).getTime()/1000);this.dd=function(){var d=top.window.document.domain;if(_lnwd.indexOf("www.")!=0&&d.indexOf("www.")==0){d=d.substring(4);}
return d;}
this.wk=function(){var c,i,h=1,s=_c.dd();var sl=s.length;var a=((1<<28)-1)-(1<<3);for(i=0;i<sl;i++){c=s.charCodeAt(i);h=(h<<7)+c+(c<<3);h&=a;}
return h;}
this.rk=function(){return Math.round(Math.random()*2147483647);}
this.cp=function(){var c="";c+="domain="+_c.dd()+";";c+="path=/;";return c;}
this.sc=function(k,v,exp){k=escape(k);v=escape(v);if(v=="null"){v="";}
var c=k+"="+v+";";if(exp!=_u&&exp!=null){var exd=new Date();exd.setTime(exd.getTime()+exp*60*1000);c+="expires="+exd.toUTCString()+";";}
c+=_c.cp();_d.cookie=c}
this.gc=function(k){k=escape(k);if(_d.cookie.length>0){var cs=_d.cookie.indexOf(k+"=");if(cs!=-1){cs=cs+k.length+1;ce=_d.cookie.indexOf(";",cs);if(ce==-1){ce=_d.cookie.length;}
v=unescape(_d.cookie.substring(cs,ce));if(v=="null"||v==""){return null;}
return v;}}
return null;}
this.gac=function(){cda=_c.gc(_ka);cdb=_c.gc(_kb);cdc=_c.gc(_kc);cdz=_c.gc(_kz);}
this.sac=function(){_c.sc(_ka,cda,365*2*1440);_c.sc(_kb,cdb,30);_c.sc(_kc,cdc);_c.sc(_kz,cdz,30*1440);}
this.i=function(){_c.gac();_c.ic();_c.ib();_c.sac();};this.ia=function(){if(cda==null){cda=_c.wk()+"."+_c.rk()+"."+_t+"."+_t+"."+_t+".1";_c.iz();}else{var arr=cda.split(".");arr[1]=_c.rk();arr[3]=arr[4];arr[4]=_t;arr[5]=(parseInt(arr[5])+1)+"";cda=arr.join(".");}};this.ib=function(){if(cdb==null){cdb=_c.wk()+".1.10."+_t;_c.ia();}else{var arr=cdb.split(".");arr[1]=(parseInt(arr[1])+1)+"";cdb=arr.join(".");}};this.ic=function(){if(cdc==null){if(cdb!=null){var arr=cdb.split(".");cdc=arr[0];}else{cdc=_c.wk();}}};this.iz=function(){if(cdz==null){var rf=new __rf();rf.r();cdz=_c.wk()+"."+_t+".1.1."+rf.se();}};this.se=function(){var t=new Array();t[t.length]=_ka+"="+cda;t[t.length]=_kb+"="+cdb;t[t.length]=_kc+"="+cdc;t[t.length]=_kz+"="+cdz;t[t.length]="c_dd="+_c.dd();return t.join("&");};this.ce=function(){return _c.gc(_kc)!=null;}
this.vla=function(){try{var arr=cda.split(".");if(arr.length!=6)return false;if(parseInt(arr[2])==0)return false;if(parseInt(arr[3])==0)return false;if(parseInt(arr[4])==0)return false;if(parseInt(arr[2])>parseInt(arr[3]))return false;if(parseInt(arr[3])>parseInt(arr[4]))return false;}catch(e){return false;}
return true;}
this.vl=function(){if(!_c.vla())return false;return true;}};var __bc=function(){var _bc=this;var _e="-";this.l=function(){return _n&&_n.language?_n.language:_n&&_n.browserLanguage?_n.browserLanguage:_e;};this.ua=function(){return _n&&_n.userAgent?_n.userAgent:_e;}
this.sc=function(){return _s?(_s.pixelDepth!==_u?_s.pixelDepth:_s.colorDepth)+"-bit":_e;};this._jsr=function(){try{var ss=window.java.awt.Toolkit.getDefaultToolkit().getScreenSize();return ss.width+"x"+ss.height;}catch(e){}
return _e;}
this.sr=function(){return _s?_s.width+"x"+_s.height:window.java?_bc._jsr():_e;};this.fv=function(){var i,fv=false,axo;var p=_n?_n.plugins:_u;if(p&&p.length>0){var pl=p.length;for(i=0;i<pl&&!fv;i++){if(p[i].name.indexOf("Shockwave Flash")>-1){fv=p[i].description.split("Shockwave Flash ")[1];}}}else{var _sf="ShockwaveFlash.ShockwaveFlash";var _v="$version";try{axo=new ActiveXObject(_sf+".7");fv=axo.GetVariable(_v);}catch(e){}
if(!fv){try{axo=new ActiveXObject(_sf+".6");fv="WIN 6,0,21,0";axo.AllowScriptAccess="always";fv=axo.GetVariable(_v);}catch(e){}}
if(!fv){try{axo=new ActiveXObject(_sf);fv=axo.GetVariable(_v);}catch(e){}}
if(fv){fv=fv.split(" ")[1].split(",");fv=fv[0]+"."+fv[1]+" r"+fv[2];}}
return fv?fv:_e;};this.js=function(){return _n&&_n.javaEnabled()?1:0;}
this.ce=function(){return _n&&_n.cookieEnabled?1:0;}
this.se=function(){var t=new Array();t[t.length]="bc_l="+_euc(_bc.l());t[t.length]="bc_ua="+_euc(_bc.ua());t[t.length]="bc_sc="+_euc(_bc.sc());t[t.length]="bc_sr="+_euc(_bc.sr());t[t.length]="bc_fv="+_euc(_bc.fv());t[t.length]="bc_js="+_euc(_bc.js());t[t.length]="bc_ce="+_euc(_bc.ce());return t.join("&");};};var __rf=function(){var _rf=this;var r=_d.referrer;var d=null;var c=null;var se={'daum':'q','eniro':'search_word','naver':'query','images.google':'q','google':'q','yahoo':'p','msn':'q','bing':'q','aol':'query','aol':'encquery','lycos':'query','ask':'q','altavista':'q','netscape':'query','cnn':'query','about':'terms','mamma':'query','alltheweb':'q','voila':'rdata','virgilio':'qs','live':'q','baidu':'wd','alice':'qs','yandex':'text','najdi':'q','aol':'q','mama':'query','seznam':'q','search':'q','wp':'szukaj','onet':'qt','szukacz':'q','yam':'k','pchome':'q','kvasir':'q','sesam':'q','ozu':'q','terra':'query','mynet':'q','ekolay':'q','rambler':'words'};var cn="(direct)";var sr="(direct)";var md="(none)";var p="/";var kw="-";this.i=function(){if(r.length!=0&&r.indexOf('//')!=-1&&r.indexOf('/',r.indexOf('//')+2)!=-1){r=r.substring(r.indexOf('//')+2);c=r.substring(r.indexOf('/'));d=r.substring(0,r.indexOf('/'));}else{r="";}}
this.gq=function(k){if(c!=null&&c.indexOf("?")!=-1){var q=c.substring(c.indexOf("?")+1);var vs=q.split("&");var i;var l=vs.length;for(i=0;i<l;i++){var p=vs[i].split("=");if(p[0]==k)
return p[1];}}
return null;}
this.o=function(){if(r.length!=0){var k;var q=null;for(k in se){if(r.indexOf(k+".")==0||r.indexOf("."+k+".")!=-1){q=_rf.gq(se[k]);if(q!=null){cn="(organic)";sr=k;md="organic";kw=q;return true;}}}}
return false;}
this.r=function(){_rf.i();if(_rf.o())return;if(d!=null){cn="(referral)";sr=d;md="referral";p=c;}}
this.se=function(){var t=new Array();t[t.length]="r_cn="+_euc(cn);t[t.length]="r_sr="+_euc(sr);t[t.length]="r_md="+_euc(md);t[t.length]="r_p="+_euc(p);t[t.length]="r_kw="+_euc(kw);return t.join("|");};};var __ct=function(){var _ct=this;var _e="-";this.tt=function(){return _d&&_d.title?_d.title.substring(0,255):_e;}
this.cs=function(){return _d&&_d.characterSet?_d.characterSet:_d&&_d.charset?_d.charset:_e;}
this.se=function(){var t=new Array();t[t.length]="ct_tt="+_euc(_ct.tt());t[t.length]="ct_cs="+_euc(_ct.cs());return t.join("&");};};var __lnwstat=function(){var _lnwstat=this;var c=new __c();var bc=new __bc();var ct=new __ct();this.se=function(){var t=new Array();t[t.length]="_lnwp="+_euc(_lnwp);t[t.length]="_lnwd="+_euc(_lnwd);t[t.length]="_lnwu="+_euc(window.document.URL);if(typeof(_lnwm)!="undefined"){t[t.length]="_lnwm="+_euc(_lnwm);}
if(typeof(_lnwk)!="undefined"){t[t.length]="_lnwk="+_euc(_lnwk);}
return t.join("&");}
this.show=function(){if(window.document.URL!=top.window.document.URL){return;}
if(c.dd()!=_lnwd){return;}
if(!bc.ce()){return;}
c.i();if(!c.ce()){return;}
if(!c.vl()){return;}
if(typeof(_lnws)=="undefined"){return;}
var a=c.se()+"&"+bc.se()+"&"+ct.se()+"&"+_lnwstat.se();var i="";i+='<img src="//'+_lnws+'/lnwstat.gif?'+a+'" border="0" />';_d.getElementById('lnwstat-container-ebi93-inner').innerHTML=i;}};if(typeof(_lnwl)!="undefined"){return;}
_lnwl=true;var lnwstat=new __lnwstat();lnwstat.show();return true;})();