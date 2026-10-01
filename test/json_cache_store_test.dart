import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:timefit_mobile/core/storage/json_cache_store.dart';

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));

  test('stores value with the last successful timestamp', () async {
    const store = JsonCacheStore();
    await store.write('schedule', {'id': 'shift-1'});

    final cached = await store.read('schedule');

    expect(cached?.value, {'id': 'shift-1'});
    expect(cached?.savedAt.isUtc, isTrue);
  });

  test('drops corrupt cache data', () async {
    SharedPreferences.setMockInitialValues({
      'timefit.cache.schedule': 'broken',
    });
    const store = JsonCacheStore();
    expect(await store.read('schedule'), isNull);
  });
}
