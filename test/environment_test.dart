import 'package:flutter_test/flutter_test.dart';
import 'package:timefit_mobile/core/config/app_config.dart';
import 'package:timefit_mobile/core/config/environment.dart';

void main() {
  test('parses supported environments and defaults safely', () {
    expect(AppEnvironmentValue.parse('staging'), AppEnvironment.staging);
    expect(AppEnvironmentValue.parse('production'), AppEnvironment.production);
    expect(AppEnvironmentValue.parse('unexpected'), AppEnvironment.development);
  });

  test('production flag follows environment', () {
    const production = AppConfig(
      environment: 'production',
      supabaseUrl: 'https://example.supabase.co',
      supabasePublishableKey: 'key',
    );
    expect(production.isProduction, isTrue);
  });
}
