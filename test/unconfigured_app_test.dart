import 'package:flutter_test/flutter_test.dart';
import 'package:timefit_mobile/app/timefit_app.dart';
import 'package:timefit_mobile/core/config/app_config.dart';

void main() {
  testWidgets('shows setup guidance when backend config is missing', (
    tester,
  ) async {
    await tester.pumpWidget(
      const TimeFitApp(
        config: AppConfig(
          environment: 'test',
          supabaseUrl: '',
          supabasePublishableKey: '',
        ),
        repository: null,
      ),
    );

    expect(find.text('TimeFit'), findsOneWidget);
    expect(find.textContaining('SUPABASE_URL'), findsOneWidget);
  });
}
