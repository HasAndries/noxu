noxuConfig.constant('browser', {
  'isIE': navigator.appName == "Microsoft Internet Explorer",
  'ieVersion': this.isIE && parseInt(navigator.appVersion.substr(navigator.appVersion.indexOf("MSIE") + 4)) || 0
});

noxuConfig.constant('url', {
  'api': 'http://localhost:3000/api/'
});