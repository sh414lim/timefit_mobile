import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app/timefit_app.dart';
import 'core/config/app_config.dart';
import 'core/storage/secure_session_storage.dart';
import 'data/supabase_session_repository.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  const config = AppConfig.fromEnvironment();
  SupabaseSessionRepository? repository;
  if (config.isConfigured) {
    await Supabase.initialize(
      url: config.supabaseUrl,
      publishableKey: config.supabasePublishableKey,
      authOptions: FlutterAuthClientOptions(
        localStorage: SecureSessionStorage(),
      ),
    );
    repository = SupabaseSessionRepository(Supabase.instance.client);
  }
  runApp(TimeFitApp(config: config, repository: repository));
}
