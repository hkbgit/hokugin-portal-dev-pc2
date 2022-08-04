var DataAccessEngineer = function () {

    function loadData (key) {
        var dataString = sessionStorage.getItem(key);
        return dataString && JSON.parse(dataString);
    }

    this.clear = function () {
        sessionStorage.clear();
    };

    this.load = function(keys, callback) {
        if (keys instanceof Array) {
            var result = {};
            for (var i = 0; i < keys.length; i++) {
                result[keys[i]] = loadData(keys[i]);
            }
            setTimeout(function () {
                callback && callback(true, result);
            }, 0);
        } else {
            var dataString = sessionStorage.getItem(keys);
            setTimeout(function () {
                callback && callback(true, dataString && JSON.parse(dataString));
            }, 0);
        }
    };

    this.loadarr = function(key, callback) {
        var dataString = sessionStorage.getItem(key);
        setTimeout(function () {
            callback && callback(true, dataString && JSON.parse(dataString));
        }, 0);
    };


    this.save = function (key, data, callback) {
        sessionStorage.setItem(key, JSON.stringify(data));
        setTimeout(function () {
            callback && callback(true);
        }, 0);
    };

    this.saveArray = function (key, array, callback) {};
    this.loadArray = function (key, callback) {};

}
