(function () {
	module('wormhole.store');


	// Проверяем работу хранилища и его изменения
	asyncTest('store', function () {
		var log = [];
		var store = wormhole.store;
		var rand = Math.random();

		ok(store.enabled, 'enabled');

		// Подписываемся на изменение данных
		store.on('change:' + rand, function (data) {
			equal(data, rand);
			log.push('rand-val');
		});

		store.set(rand, rand);
		store.set('rand', rand);

		// Подписываемся на изменение данных
		store.on('change', function () {
			log.push('change');
		});

		// Подписываем на конкретный ключ
		store.on('change:foo', function (key, val) {
			log.push('change:foo-' + val);
		});

		// Создаем iframe на текущий домен
		_createWin('local.test.html').then(function (el) {
			// Получаем экземпляр store из iframe
			var winStore = el.contentWindow.wormhole.store;

			// Сверяем значения
			equal(winStore.get('rand'), rand);

			// Устанавливаем какое-то значения, для проверки событий
			winStore.set('foo', rand);

			// Выставляем значение и сразу читаем его
			store.set('bar', rand);
			equal(winStore.get('bar'), rand, 'bar.rand');

			winStore.set('bar', rand + '!');
			equal(store.get('bar'), rand + '!', 'bar.rand!');

			setTimeout(function () {
				// Проверяем события
				deepEqual(log, [
					'rand-val',
					'change',
					'change',
					'change:foo-' + rand,
					'change'
				]);

				// Чтение
				equal(store.get('foo'), rand);

				// Удаление
				store.remove('foo');
				equal(store.get('foo'), void 0);

				start();
			}, 100);
		});
	});

})();
