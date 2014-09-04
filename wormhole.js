(function (window, document) {
	var __emitter__ = '__emitter__';

	function getListeners(obj, name) {
		if (obj[__emitter__] === void 0) {
			obj[__emitter__] = {};
		}

		obj = obj[__emitter__];

		if (obj[name] === void 0) {
			obj[name] = [];
		}

		return obj[name];
	}


	function emitter() {
	}


	emitter.fn = emitter.prototype = /** @lends emitter.prototype */ {
		/**
		 * Подписаться на событие
		 * @param   {String}   name
		 * @param   {Function} fn
		 * @returns {emitter}
		 */
		on: function (name, fn) {
			getListeners(this, name).push(fn);
			return this;
		},


		/**
		 * Отписаться от событие
		 * @param   {String}   name
		 * @param   {Function} fn
		 * @returns {emitter}
		 */
		off: function (name, fn) {
			var listeners = getListeners(this, name),
				i = listeners.length;

			while (i--) {
				// Ищем слушателя и удаляем (indexOf - IE > 8)
				if (listeners[i] === fn) {
					listeners.splice(i, 1);
					break;
				}
			}

			return this;
		},


		/**
		 * Распространить данные
		 * @param   {String}   name
		 * @param   {*}        [data]
		 */
		emit: function (name, data) {
			var listeners = getListeners(this, name),
				i = listeners.length;

			while (i--) {
				listeners[i].call(this, data);
			}
		}
	};


	emitter.apply = function (target) {
		target.on = emitter.fn.on;
		target.off = emitter.fn.off;
		target.emit = emitter.fn.emit;

		return target;
	};


	

	var _corsId = 1,
		_corsExpando = '__cors__',
		_corsCallback = {},
		_parseJSON = JSON.parse,
		_stringifyJSON = JSON.stringify
	;



	/**
	 * @class  cors
	 * @param  {Window}  el
	 */
	function cors(el) {
		if (!(this instanceof cors)) {
			return new cors(el);
		}

		try {
			// Если это iframe
			el = el.contentWindow || /* istanbul ignore next */ el;
		} catch (err) {}

		this.window = el;
	}


	cors.fn = cors.prototype = {
		call: function (cmd, data, callback) {
			var evt = {
				cmd: cmd,
				data: data
			};

			evt[_corsExpando] = ++_corsId;
			_corsCallback[_corsId] = callback;

			this.send(evt);
		},

		send: function (data) {
			this.window.postMessage(_corsExpando + _stringifyJSON(data), '*');
		}
	};


	/**
	 * Получение `postMessage`
	 * @param {Event} evt
	 * @private
	 */
	function _onmessage(evt) {
		evt = evt || /* istanbul ignore next */ window.event;

		var id,
			resp = {},
			data = evt.data;

		/* istanbul ignore else */
		if (data.indexOf(_corsExpando) === 0) {
			// Наше сообщение
			try {
				// Парсим данные
				data = _parseJSON(evt.data.substr(_corsExpando.length));
				id = data[_corsExpando];

				/* istanbul ignore else */
				if (id) {
					// Это call или ответ на него
					/* istanbul ignore else */
					if (data.response) {
						/* istanbul ignore else */
						if (_corsCallback[id]) {
							_corsCallback[id](data.error, data.result);
							delete _corsCallback[id];
						}
					}
					else {
						// Фомируем ответ
						resp.response =
						resp[_corsExpando] = id;

						try {
							resp.result = cors[data.cmd](data.data);
						} catch (err) {
							resp.error = err.toString();
						}

						cors(evt.source).send(resp);
					}
				}
				else {
					cors.emit('data', data);
				}

			}
			catch (err) {
				/* istanbul ignore next */
				cors.emit('error', err);
			}
		}
	}


	// Подмешиваем
	emitter.apply(cors);


	/* istanbul ignore else */
	if (window.addEventListener) {
		window.addEventListener('message', _onmessage, false);
	} else {
		window.attachEvent('onmessage', _onmessage);
	}


	

	var store,
		_storage,
		_storageNS = '__wormhole.store__:',
		_storageData = {},

		_parseJSON = JSON.parse,
		_stringifyJSON = JSON.stringify
	;


	function _storageKey(key) {
		return _storageNS + key;
	}


	function _isStoreKey(key) {
		return key.indexOf(_storageNS) === 0;
	}


	function _getCleanedKey(key) {
		return key.substr(_storageNS.length);
	}


	/**
	 * Получить рабочий storage по названию
	 * @param   {String}  name
	 * @returns {sessionStorage}
	 * @private
	 */
	function _getStorage(name) {
		try {
			var storage = window[name + 'Storage'];

			storage.setItem(_storageNS, _storageNS);

			/* istanbul ignore else */
			if (storage.getItem(_storageNS) == _storageNS) {
				storage.removeItem(_storageNS);
				return storage;
			}
		} catch (err) { }
	}


	//  Пробуем получить sessionStorage, либо localStorage
	_storage = _getStorage('session') || /* istanbul ignore next */ _getStorage('local');


	store = emitter.apply({
		set: function (key, value) {
			_storageData[key] = value;
			_storage && _storage.setItem(_storageKey(key), _stringifyJSON(value));
		},

		get: function (key) {
			return _storageData[key];
		},

		remove: function (key) {
			delete _storageData[key];
			_storage && _storage.removeItem(_storageKey(key));
		}
	});


	function _onsync(evt) {
		var fullKey = evt.key,
			key = _getCleanedKey(fullKey),
			newValue,
			oldValue;

		if (key && _isStoreKey(fullKey)) {
			newValue = _storage.getItem(fullKey);
			oldValue = _stringifyJSON(_storageData[key]);

			/* istanbul ignore else */
			if (newValue !== oldValue) {
				_storageData[key] = (newValue = _parseJSON(newValue));

				store.emit('change', _storageData);
				store.emit('change:' + key, newValue);
			}
		}
	}


	// Получаем текущее состояние
	_storage && (function () {
		var i = _storage.length,
			key;

		/* istanbul ignore next */
		while (i--) {
			key = _storage.key(i);

			if (_isStoreKey(key)) {
				_storageData[_getCleanedKey(key)] = _parseJSON(_storage.getItem(key));
			}
		}

		/* istanbul ignore else */
		if (window.addEventListener) {
			window.addEventListener('storage', _onsync, false);
		} else {
			window.attachEvent('onstorage', _onsync);
		}
	})();


	

	window.wormhole = {
		cors: cors,
		store: store,
		emitter: emitter
	};
})(window, document);