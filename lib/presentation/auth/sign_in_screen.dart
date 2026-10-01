import 'package:flutter/material.dart';
import '../../application/session_controller.dart';

class SignInScreen extends StatefulWidget {
  const SignInScreen({super.key, required this.controller});
  final SessionController controller;
  @override
  State<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends State<SignInScreen> {
  final email = TextEditingController();
  final password = TextEditingController();
  @override
  void dispose() {
    email.dispose();
    password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 64, 20, 24),
        children: [
          Text(
            '일하는 시간을\n더 단순하게',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 12),
          const Text('근무 일정과 출퇴근, 요청과 승인을 TimeFit에서 확인하세요.'),
          const SizedBox(height: 44),
          TextField(
            controller: email,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.next,
            decoration: const InputDecoration(labelText: '이메일'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: password,
            obscureText: true,
            onSubmitted: (_) => submit(),
            decoration: const InputDecoration(labelText: '비밀번호'),
          ),
          if (widget.controller.errorMessage != null) ...[
            const SizedBox(height: 12),
            Text(
              widget.controller.errorMessage!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ],
          const SizedBox(height: 24),
          FilledButton(onPressed: submit, child: const Text('로그인')),
        ],
      ),
    ),
  );

  void submit() {
    if (email.text.trim().isEmpty || password.text.isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('이메일과 비밀번호를 입력해 주세요.')));
      return;
    }
    widget.controller.signIn(email.text, password.text);
  }
}
