'use client';

import { useSearchParams } from 'next/navigation';
import { AbiDecoder } from '@/components/tools/AbiDecoder';
import { AddressValidator } from '@/components/tools/AddressValidator';
import { GasCalculator } from '@/components/tools/GasCalculator';
import { HexConverter } from '@/components/tools/HexConverter';
import { TimestampConverter } from '@/components/tools/TimestampConverter';
import { TxDecoder } from '@/components/tools/TxDecoder';
import { UnitConverter } from '@/components/tools/UnitConverter';
import type { ToolSlug } from '@/config/tools';

function AbiFromParams() {
  const data = useSearchParams().get('data') ?? '';
  return <AbiDecoder key={data} initialData={/^0x[0-9a-fA-F]*$/.test(data) ? data : ''} />;
}

export function ToolBody({ slug }: { slug: ToolSlug }) {
  switch (slug) {
    case 'unit-converter':
      return <UnitConverter />;
    case 'address-validator':
      return <AddressValidator />;
    case 'hex-converter':
      return <HexConverter />;
    case 'timestamp-converter':
      return <TimestampConverter />;
    case 'gas-calculator':
      return <GasCalculator />;
    case 'abi-decoder':
      return <AbiFromParams />;
    case 'transaction-decoder':
      return <TxDecoder />;
  }
}
