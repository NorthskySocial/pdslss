import { Client, simpleFetchHandler } from '@atcute/client';
import type { Did } from '@atcute/lexicons';
import { resolvePDS } from '../utils/api';
import type { StratosEnrollment } from './state';

const isEnrollmentRecord = (val: unknown): val is {
	service: string;
	boundaries?: Array<{ value: string }>;
	createdAt: string;
} => {
	if (typeof val !== 'object' || val === null) return false;
	const obj = val as Record<string, unknown>;
	return typeof obj.service === 'string' && typeof obj.createdAt === 'string';
};

export const discoverStratosEnrollment = async (
	did: Did,
): Promise<StratosEnrollment | null> => {
	const pds = await resolvePDS(did);
	const rpc = new Client({ handler: simpleFetchHandler({ service: pds }) });
	const res = await rpc.get('com.atproto.repo.getRecord', {
		params: {
			repo: did,
			collection: 'app.stratos.actor.enrollment',
			rkey: 'self',
		},
	});
	if (!res.ok) return null;

	const val = res.data.value;
	if (!isEnrollmentRecord(val)) return null;

	return {
		service: val.service,
		boundaries: Array.isArray(val.boundaries) ? val.boundaries : [],
		createdAt: val.createdAt,
	};
};
