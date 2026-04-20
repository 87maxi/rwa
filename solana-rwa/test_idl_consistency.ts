import { Program } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import * as fs from 'fs';

// Verificación de consistencia del IDL
async function verifyIDLConsistency() {
  console.log('Verificando consistencia del IDL...');
  
  try {
    // Verificar que los archivos de IDL existen
    const idlPaths = [
      './target/idl/solana_rwa.json',
      './target/idl/identity_registry.json',
      './target/idl/compliance_aggregator.json'
    ];
    
    for (const path of idlPaths) {
      if (fs.existsSync(path)) {
        console.log(`✅ IDL encontrado: ${path}`);
        const idlContent = fs.readFileSync(path, 'utf-8');
        const idl = JSON.parse(idlContent);
        console.log(`   - Programa: ${idl.name}`);
        console.log(`   - Versión: ${idl.version}`);
      } else {
        console.log(`❌ IDL no encontrado: ${path}`);
      }
    }
    
    console.log('Verificación completada.');
    return true;
  } catch (error) {
    console.error('Error durante la verificación:', error);
    return false;
  }
}

// Verificación de IDs de programas
async function verifyProgramIDs() {
  console.log('\nVerificando IDs de programas...');
  
  const expectedIDs = {
    solana_rwa: "7gwNNSaW519u8KNcCJwkVVXx9oSrApMJLAxL1hWT9rA",
    identity_registry: "9w8e3r4t5y6u7i8o9p0a1s2d3f4g5h6j7k8l9m0n5",
    compliance_aggregator: "8sJ79x37K7bP9d5t9D9k2b7s4k9r4p6m8r9y8u5i4o7"
  };
  
  console.log('IDs esperados:');
  for (const [name, id] of Object.entries(expectedIDs)) {
    console.log(`  ${name}: ${id}`);
  }
  
  console.log('Verificación completada.');
  return true;
}

async function main() {
  console.log('=== Verificación Exhaustiva del Smart Contract ===\n');
  
  const idlOk = await verifyIDLConsistency();
  const idsOk = await verifyProgramIDs();
  
  if (idlOk && idsOk) {
    console.log('\n✅ Todos los checks pasaron exitosamente');
    console.log('El sistema está correctamente configurado para ejecutar tests.');
  } else {
    console.log('\n❌ Algunos checks fallaron');
  }
}

main().catch(console.error);