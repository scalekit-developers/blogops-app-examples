import { swaggerSpec } from '../../../lib/swaggerSpec';
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(swaggerSpec);
}
