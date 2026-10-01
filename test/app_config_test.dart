import 'package:flutter_test/flutter_test.dart';
import 'package:timefit_mobile/core/config/app_config.dart';

void main() {
  test('requires both Supabase values', () {
    const missing = AppConfig(
      environment: 'test',
      supabaseUrl: '',
      supabasePublishableKey: 'key',
    );
    const configured = AppConfig(
      environment: 'test',
      supabaseUrl: 'https://example.supabase.co',
      supabasePublishableKey: 'key',
    );

    expect(missing.isConfigured, isFalse);
    expect(configured.isConfigured, isTrue);
  });
}
