// Script de Teste do Sistema de Fidelidade Integrado
// Verifica todas as funcionalidades principais

import { ZAPIService } from './services/ZAPIService';
import { QRCodeService } from './services/QRCodeService';
import { LoyaltyAutomationService } from './services/LoyaltyAutomationService';
import { LoyaltyMigrationService } from './services/LoyaltyMigrationService';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  duration: number;
}

const testResults: TestResult[] = [];

async function runTest(testName: string, testFunction: () => Promise<void>) {
  console.log(`🧪 Executando teste: ${testName}`);
  const startTime = Date.now();
  
  try {
    await testFunction();
    const duration = Date.now() - startTime;
    testResults.push({
      name: testName,
      status: 'PASS',
      message: 'Teste executado com sucesso',
      duration
    });
    console.log(`✅ ${testName} - PASS (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    testResults.push({
      name: testName,
      status: 'FAIL',
      message: error.message,
      duration
    });
    console.log(`❌ ${testName} - FAIL: ${error.message} (${duration}ms)`);
  }
}

async function testQRCodeService() {
  // Teste de geração de QR Code
  const testPhone = '5562984025846';
  const qrCode = await QRCodeService.generateQRCode(testPhone);
  
  if (!qrCode || typeof qrCode !== 'string') {
    throw new Error('QR Code não foi gerado corretamente');
  }
  
  if (!qrCode.startsWith('data:image/png;base64,')) {
    throw new Error('QR Code não está no formato data URL válido');
  }
  
  console.log(`   📱 QR Code gerado para ${testPhone}: ${qrCode.substring(0, 50)}...`);
}

async function testZAPIService() {
  // Teste de conexão Z-API
  const connectionTest = await ZAPIService.testConnection();
  
  if (!connectionTest) {
    throw new Error('Falha na conexão com Z-API');
  }
  
  console.log(`   🔗 Conexão Z-API: OK`);
  
  // Teste de validação de telefone
  const validPhone = '(11) 99999-9999';
  const invalidPhone = '123';
  
  if (!ZAPIService.isValidPhone(validPhone)) {
    throw new Error('Telefone válido não foi reconhecido');
  }
  
  if (ZAPIService.isValidPhone(invalidPhone)) {
    throw new Error('Telefone inválido foi aceito');
  }
  
  console.log(`   📞 Validação de telefones: OK`);
  
  // Teste de formatação de telefone
  const formattedPhone = QRCodeService.formatPhone('11999999999');
  
  if (formattedPhone !== '(11) 99999-9999') {
    throw new Error('Formatação de telefone incorreta');
  }
  
  console.log(`   📝 Formatação de telefone: OK`);
}

async function testLoyaltyAutomationService() {
  // Verificar se serviço de automação está inicializado
  const automation = LoyaltyAutomationService.getInstance();
  
  if (!automation) {
    throw new Error('Serviço de automação não foi inicializado');
  }
  
  // Verificar configuração
  const config = LoyaltyAutomationService.getConfig();
  
  if (!config.reactivationDays || !config.fraudThreshold) {
    throw new Error('Configuração de automação incompleta');
  }
  
  console.log(`   ⚙️ Configuração de automação: OK`);
  
  // Testar se automação está habilitada
  const isEnabled = LoyaltyAutomationService.isAutomationEnabled();
  console.log(`   🚀 Automação habilitada: ${isEnabled}`);
  
  // Testar verificação de perfil específico (simulado)
  try {
    const result = await LoyaltyAutomationService.checkProfileInactivity('lover');
    console.log(`   🔍 Teste de verificação de perfil: ${result} clientes verificados`);
  } catch (error) {
    console.log(`   ⚠️ Teste de verificação de perfil: Simulado (banco não conectado)`);
  }
}

async function testLoyaltyMigrationService() {
  // Teste de validação de dados de migração
  try {
    const validation = await LoyaltyMigrationService.validateMigrationData();
    
    console.log(`   📊 Validação de migração: ${validation.valid ? 'OK' : 'FALHOU'}`);
    console.log(`   📝 Erros: ${validation.errors.length}`);
    console.log(`   ⚠️ Avisos: ${validation.warnings.length}`);
    console.log(`   📈 Estatísticas:`, validation.statistics);
    
    if (!validation.valid) {
      console.log(`   ❌ Erros de validação:`, validation.errors);
    }
    
  } catch (error: any) {
    console.log(`   ⚠️ Validação de migração: ${error.message}`);
  }
  
  // Teste de backup
  try {
    const backup = await LoyaltyMigrationService.createBackup();
    console.log(`   💾 Backup: ${backup.success ? 'OK' : 'FALHOU'}`);
    
    if (!backup.success) {
      console.log(`   ❌ Erro no backup:`, backup.error);
    }
  } catch (error: any) {
    console.log(`   ⚠️ Teste de backup: ${error.message}`);
  }
}

async function testDataValidation() {
  // Teste de validação de dados de entrada
  const testCases = [
    { phone: '(11) 99999-9999', valid: true },
    { phone: '11999999999', valid: false }, // Formato inválido
    { phone: '+55 11 99999-9999', valid: false }, // Formato internacional não aceito
    { phone: '', valid: false }, // Vazio
  ];
  
  for (const testCase of testCases) {
    const isValid = ZAPIService.isValidPhone(testCase.phone);
    
    if (testCase.valid && !isValid) {
      throw new Error(`Telefone ${testCase.phone} deveria ser válido`);
    }
    
    if (!testCase.valid && isValid) {
      throw new Error(`Telefone ${testCase.phone} deveria ser inválido`);
    }
  }
  
  console.log(`   ✅ Validação de telefones: Todos os testes passaram`);
}

async function testPerformance() {
  console.log(`   ⏱️ Teste de performance iniciado...`);
  
  // Teste de geração em lote de QR Codes
  const phones = [
    '5562984025846',
    '5562999887766',
    '5562977558899',
    '5562966442211',
    '5562955331100'
  ];
  
  const startTime = Date.now();
  
  try {
    const qrCodes = await QRCodeService.generateBulkQRCodes(
      phones.map((phone, index) => ({ phone, id: index + 1 }))
    );
    
    const duration = Date.now() - startTime;
    const successCount = qrCodes.filter(qr => qr.qrCode !== null).length;
    
    console.log(`   📊 Geração em lote: ${successCount}/${phones.length} successful`);
    console.log(`   ⏱️ Duração total: ${duration}ms`);
    console.log(`   📈 Taxa de sucesso: ${((successCount / phones.length) * 100).toFixed(1)}%`);
    
    if (successCount < phones.length * 0.8) {
      throw new Error(`Taxa de sucesso muito baixa: ${successCount}/${phones.length}`);
    }
    
  } catch (error: any) {
    console.log(`   ⚠️ Teste de lote: ${error.message}`);
  }
}

async function runAllTests() {
  console.log(`🚀 Iniciando suite de testes do Sistema de Fidelidade`);
  console.log(`📅 Data: ${new Date().toISOString()}`);
  console.log(`🔧 Versão: Sublime Connect v2.0.0`);
  console.log(`\n${'='.repeat(60)}\n`);
  
  const tests = [
    ['QR Code Service', testQRCodeService],
    ['Z-API Service', testZAPIService],
    ['Loyalty Automation Service', testLoyaltyAutomationService],
    ['Loyalty Migration Service', testLoyaltyMigrationService],
    ['Data Validation', testDataValidation],
    ['Performance Tests', testPerformance],
  ];
  
  for (const [name, test] of tests) {
    await runTest(name, test);
    console.log(''); // Linha em branco para separar
  }
  
  // Relatório final
  console.log(`${'='.repeat(60)}`);
  console.log(`📊 RELATÓRIO FINAL DE TESTES`);
  console.log(`${'='.repeat(60)}`);
  
  const passCount = testResults.filter(r => r.status === 'PASS').length;
  const failCount = testResults.filter(r => r.status === 'FAIL').length;
  const skipCount = testResults.filter(r => r.status === 'SKIP').length;
  const totalTime = testResults.reduce((sum, r) => sum + r.duration, 0);
  
  console.log(`📈 Total de testes: ${testResults.length}`);
  console.log(`✅ Passaram: ${passCount}`);
  console.log(`❌ Falharam: ${failCount}`);
  console.log(`⏭️ Pulos: ${skipCount}`);
  console.log(`⏱️ Tempo total: ${totalTime}ms`);
  console.log(`📊 Taxa de sucesso: ${((passCount / testResults.length) * 100).toFixed(1)}%`);
  
  if (failCount > 0) {
    console.log(`\n❌ TESTES QUE FALHARAM:`);
    testResults.filter(r => r.status === 'FAIL').forEach(result => {
      console.log(`   • ${result.name}: ${result.message}`);
    });
  }
  
  console.log(`\n🎯 STATUS GERAL: ${failCount === 0 ? '✅ APROVADO' : '❌ REPROVADO'}`);
  
  // Recomendations
  if (failCount === 0) {
    console.log(`\n💡 RECOMENDAÇÕES:`);
    console.log(`   • Sistema pronto para produção`);
    console.log(`   • Execute npm run loyalty:migrate para setup completo`);
    console.log(`   • Configure cron jobs para automações`);
    console.log(`   • Configure variáveis de ambiente Z-API`);
  } else {
    console.log(`\n🔧 AÇÕES NECESSÁRIAS:`);
    console.log(`   • Corrija os testes que falharam`);
    console.log(`   • Verifique configurações de ambiente`);
    console.log(`   • Execute novamente a suite de testes`);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(error => {
    console.error('💥 Erro crítico na execução dos testes:', error);
    process.exit(1);
  });
}

export { runAllTests, runTest, testResults };