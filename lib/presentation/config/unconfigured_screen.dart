import 'package:flutter/material.dart';

class UnconfiguredScreen extends StatelessWidget {
  const UnconfiguredScreen({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Spacer(),
            Text('TimeFit', style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 12),
            const Text('앱 연결 정보가 필요해요. 실행 환경에 Supabase 값을 설정해 주세요.'),
            const SizedBox(height: 20),
            const SelectableText(
              '--dart-define=SUPABASE_URL=...\n--dart-define=SUPABASE_PUBLISHABLE_KEY=...',
            ),
            const Spacer(flex: 2),
          ],
        ),
      ),
    ),
  );
}
