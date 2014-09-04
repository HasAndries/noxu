var noxuConfig = angular.module('noxu.config', []);
var noxuServices = angular.module('noxu.services', []);
var noxuFilters = angular.module('noxu.filters', []);
var noxuDirectives = angular.module('noxu.directives', []);

var noxu = angular.module('noxu', ['noxu.config', 'noxu.services', 'noxu.filters', 'noxu.directives']).run();