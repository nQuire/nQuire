
/*global nQuireJsSupport*/

$(function() {
  var DynamicMeasureServiceDelegate = function(service, elementId) {
    this._service = service;
    this._elementId = elementId;
  };

  DynamicMeasureServiceDelegate.prototype.saveData = function(data, automaticSave) {
    this._service._saveData(this._elementId, data, automaticSave);
  };

  DynamicMeasureServiceDelegate.prototype.getData = function() {
    return this._service._getData(this._elementId);
  };

  DynamicMeasureServiceDelegate.prototype.dataChanged = function() {
    this._service._dataChanged();
  };

  DynamicMeasureServiceDelegate.prototype.randomDelayProcessStarted = function() {
    this._service._randomDelayProcessStarted(this._elementId);
  };

  DynamicMeasureServiceDelegate.prototype.randomDelayProcessStopped = function() {
    this._service._randomDelayProcessStopped(this._elementId);
  };

  DynamicMeasureServiceDelegate.prototype.requestUserDelayProcessStart = function(callback) {
    this._service._requestUserDelayProcessStart(this._elementId, callback);
  };

  DynamicMeasureServiceDelegate.prototype.userDelayProcessStopped = function() {
    this._service._userDelayProcessStopped(this._elementId);
  };



  nQuireJsSupport.register('DynamicMeasureService', {
    _measureHandlers: null,
    _ongoingRandomDelayProcesses: null,
    _ongoingUserDelayProcesses: null,
    _endDataInputCallback: null,
    _userProcessListeners: null,
    _changeListeners: null,
    init: function() {
      this._measureHandlers = {};
      this._ongoingRandomDelayProcesses = {};
      this._ongoingUserDelayProcesses = {};
      this._userProcessListeners = [];
      this._changeListeners = [];
    },
    registerMeasure: function(elementId, handler) {
      this._measureHandlers[elementId] = handler;
      handler.setServiceDelegate(new DynamicMeasureServiceDelegate(this, elementId));
      handler.initMeasureValue(this._getData(elementId));
    },
    addUserChangeListener: function(callback) {
      this._changeListeners.push(callback);
    },
    addUserProcessListener: function(callback) {
      this._userProcessListeners.push(callback);
    },
    /**
     * 
     * @param {callback} callback
     * @returns {bool} Whether the callback was called immediately
     */
    prepareToSave: function(callback) {
      this._submitOnProgress = true;

      for (var i in this._measureHandlers) {
        var mh = this._measureHandlers[i];
        if (mh.prepareToSave) {
          mh.prepareToSave();
        }
      }

      return this.endDataInput(callback);
    },
    submitComplete: function() {
      this._submitOnProgress = false;
      this._checkCanStartUserProcess();
    },
    _checkCanStartUserProcess: function() {
      if (!this._submitOnProgress && this._requestedUserProcess) {
        var process = this._requestedUserProcess;
        this._requestedUserProcess = null;
        this._ongoingUserDelayProcesses[process.elementId] = true;
        process.callback();
        this._fireUserProcessEvent(true);
      }
    },
    /**
     * 
     * @param {callback} callback
     * @returns {bool} Whether the callback was called immediately
     */
    endDataInput: function(callback) {
      this.stopUserInputProcesses();

      if (this._randomDelayProcessesActive()) {
        this._endDataInputCallback = callback;
        this._checkEndOfDataInput();
        return false;
      } else {
        callback();
        return true;
      }
    },
    stopUserInputProcesses: function() {
      for (var elementId in this._ongoingUserDelayProcesses) {
        if (this._ongoingUserDelayProcesses[elementId]) {
          var handler = this._measureHandlers[elementId];
          handler.stopUserDelayProcess();
          this._ongoingUserDelayProcesses[elementId] = false;
          this._fireUserProcessEvent(false);
        }
      }
    },
    getMeasureHandler: function(elementId) {
      return this._measureHandlers[elementId];
    },
    elementIsUnderUserInput: function(elementId) {
      return this._ongoingUserDelayProcesses[elementId] ? true : false;
    },
    _randomDelayProcessesActive: function() {
      var active = false;
      for (var elementId in this._ongoingRandomDelayProcesses) {
        if (this._ongoingRandomDelayProcesses[elementId]) {
          active = true;
          break;
        }
      }
      return active;
    },
    _checkEndOfDataInput: function() {
      if (this._endDataInputCallback) {
        if (!this._randomDelayProcessesActive()) {
          var f = this._endDataInputCallback;
          this._endDataInputCallback = null;
          f();
        }
      }
    },
    _saveData: function(elementId, data, automaticSave) {
      var element = $('input[name="' + elementId + '"]');
      if (element && typeof data !== 'undefined' && element.val() !== data) {
        element.val(data);
        for (var i in this._changeListeners) {
          this._changeListeners[i](automaticSave);
        }
      }
    },
    _dataChanged: function() {
      for (var i in this._changeListeners) {
        this._changeListeners[i](false);
      }
    },
    _fireUserProcessEvent: function(active) {
      for (var i in this._userProcessListeners) {
        this._userProcessListeners[i](active);
      }
    },
    _getData: function(elementId) {
      return $('input[name="' + elementId + '"]').val();
    },
    _randomDelayProcessStarted: function(elementId) {
      this._ongoingRandomDelayProcesses[elementId] = true;
    },
    _randomDelayProcessStopped: function(elementId) {
      this._ongoingRandomDelayProcesses[elementId] = false;
      this._checkEndOfDataInput();
    },
    _requestUserDelayProcessStart: function(elementId, callback) {
      this.stopUserInputProcesses();
      this._requestedUserProcess = {
        elementId: elementId,
        callback: callback
      };
      this._checkCanStartUserProcess();
    },
    _userDelayProcessStopped: function(elementId) {
      this._ongoingUserDelayProcesses[elementId] = false;
      this._fireUserProcessEvent(false);
    }
  });
});


(function($) {
  var methods = {
    init: function(options) {
      this.addClass('dynamic_measure_link');
      if (options.disabled) {
        this.addClass('dynamic_measure_link_disabled');
      }

      this.click(function() {
        if (!$(this).hasClass('dynamic_measure_link_disabled')) {
          options.callback();
        }
        return false;
      });
      return this;
    },
    enable: function() {
      this.removeClass('dynamic_measure_link_disabled');
    },
    disable: function() {
      this.addClass('dynamic_measure_link_disabled');
    }
  };

  $.fn.nQuireDynamicMeasureLink = function(method) {
    if (methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if (typeof method === 'object' || !method) {
      return methods.init.apply(this, arguments);
    } else {
      console.log('Method ' + method + ' does not exist on jQuery.nQuireDynamicMeasureLink');
      return false;
    }
  };
})(jQuery);


