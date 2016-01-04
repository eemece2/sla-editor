angular.module('myApp')
.controller('AppController', function() {
    var vm = this;

    vm.width = 800;
    vm.height = 800;

    this.newWidth = function() {
        vm.width = 2000;
    };
});
