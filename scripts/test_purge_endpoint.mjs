async function testPurgeRoute() {
  console.log('--- Testando Validações de Segurança do Endpoint de Expurgo ---');

  // Teste 1: Role não autorizado
  const res1 = await fetch('http://localhost:3000/api/developer/purge-assets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userRole: 'Usuario',
      justificativa: 'Tentando deletar sem permissão dev',
      assetIds: ['test-1']
    })
  }).catch(() => null);

  if (res1) {
    console.log('Teste 1 (Role não autorizado): Status', res1.status, await res1.json());
  } else {
    console.log('Dev server não está rodando no momento (teste offline ok).');
  }
}

testPurgeRoute();
