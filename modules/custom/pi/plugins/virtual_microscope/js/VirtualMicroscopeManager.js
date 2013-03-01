

$(function() {
  nQuireJsSupport.register('VirtualMicroscopeManager', {
    _messageCallbacks: null,
    _status: null,
    _statusListeners: null,
    _position: null,
    _positionListeners: null,
    _lengthMeasure: null,
    _lengthMeasureListeners: null,
    _sample: null,
    _divContainer: null,
    _iframe: null,
    _samplesPath: null,
    init: function(dependencies) {
      this._messageListeners = {};

      this._status = false;
      this._statusListeners = [];

      this._position = null;
      this._positionListeners = [];

      this._samplesPath = dependencies.VirtualMicroscopePath.path;
      this._divContainer = $('#virtual_microscope_container');

      var self = this;
      window.addEventListener("message", function(event) {
        self._receiveMessage(event);
      }, false);

      this._captureMessages('monitor', function(msg) {
        self._monitorMessageReceived(msg);
      });
    },
    addStatusListener: function(callback) {
      this._statusListeners.push(callback);
      callback(this._status);
    },
    addPositionListener: function(callback) {
      this._positionListeners.push(callback);
      callback(this._position);
    },
    _captureMessages: function(message, callback, justOne) {
      this._messageListeners[message] = {
        callback: callback,
        justOne: justOne
      };
    },
    _stopCapturingMessage: function(message) {
      if (this._messageListeners[message]) {
        delete this._messageListeners[message];
      }
    },
    _monitorMessageReceived: function(msg) {
      if (msg.param === 'PositionPixels') {
        if (msg.content) {
          if (!this._position || this._position.sample !== this._sample ||
                  this._position.position.x !== msg.content.x || this._position.position.y !== msg.content.y ||
                  this._position.position.zoom !== msg.content.zoom) {

            this._position = {
              sample: this._sample,
              position: msg.content
            };
            for (var i in this._positionListeners) {
              this._positionListeners[i](this._position);
            }
            console.log(this._position);
          }
        }
      }
    },
    setSample: function(sample) {
      if (sample !== this._sample) {
        this._fireStatusChanged(false);
        this._sample = sample;

        if (this._iframe) {
          this._iframe.remove();
          this._iframe = null;
        }

        if (sample) {
          this._iframe = $('<iframe>').addClass('virtual_microscope_iframe').appendTo(this._divContainer);
          this._iframe.attr('src', this._samplesPath + sample);

          var probing = true;
          var self = this;
          this._captureMessages('list', function() {
            probing = false;
            self._fireStatusChanged(true);
            console.log('vm ready!');
          }, true);
          var schedule = function() {
            setTimeout(probe, 10);
          };
          var probe = function() {
            if (probing) {
              console.log('probing...');
              self._post('list');
              schedule();
            }
          };
          schedule();
          return false;
        }
      }
      return true;
    },
    _fireStatusChanged: function(status) {
      this._status = status;

      if (status) {
        this._post('monitor', 'MeasureMM');
        this._post('monitor', 'PositionPixels');
      } else {
        this._position = this._lengthMeasure = null;
      }

      for (var i = 0; i < this._statusListeners.length; i++) {
        this._statusListeners[i](status);
      }
    },
    /* VM communication functions */

    _post: function(action, param, value) {
      try {
        var iframe = this._iframe[0].contentWindow;
        if (!iframe.onerror) {
          iframe.onerror = function(error) {
            console.log('iframe error: ' + error);
            return true;
          };
        }
        var msg = {
          action: action
        };
        if (action !== 'list') {
          msg.activityId = 0;
        }
        if (typeof(param) !== 'undefined') {
          msg.param = param;
        }
        if (value) {
          msg.value = value;
        }

        if (iframe && iframe.postMessage) {
          iframe.postMessage(msg, location.href);
        } else {
          console.log('ERROR: Messaging is not available');
        }
      } catch (err) {
        console.log(err);
      }
    },
    _receiveMessage: function(event) {
      var msg = event.data;
      var listener = this._messageListeners[msg.action];
      if (listener) {
        if (listener.justOne) {
          var c = listener.callback;
          this._stopCapturingMessage(msg.action);
          c(msg);
        } else {
          listener.callback(msg);
        }
      }
    }
  }, ['VirtualMicroscopePath']);
});
