import util from 'util';
import { pipeline, Readable } from 'stream';
import { Parser } from 'csv-parse';
import Joi from 'joi';
import { WALLET_CSV_HEADERS } from './constants';
import toArray from '../../../utils/stream/pipeline/toArray';
import { AdapterError, adaptTransaction, adaptTransfer } from './adapters';
import { importTransaction, ImportError, importTransfer } from '../importer';
import { ImportedItemResult, ImportResult } from '../types';
import { RawRecord } from './types';
import { validateRawRecord } from './validation';
import { ParseError, parseRawRecord } from './parsing';

const pipelineAsync = util.promisify(pipeline);

export default async function importFile(file: Readable): Promise<ImportResult> {
  const stream = file.pipe(new Parser({
    delimiter: ';',
    fromLine: 2,
    columns: [...WALLET_CSV_HEADERS],
  }));

  const rawRecords = await pipelineAsync(stream, toArray) as RawRecord[];

  return Promise.all(
    rawRecords.map(async (rawRecord): Promise<ImportedItemResult> => {
      try {
        validateRawRecord(rawRecord);
        const parsedRecord = parseRawRecord(rawRecord);

        if (parsedRecord.isTransfer) {
          await importTransfer(await adaptTransfer(parsedRecord));
        } else {
          await importTransaction(await adaptTransaction(parsedRecord));
        }

        return { status: 'ok', data: rawRecord };
      } catch (e) {
        if (e instanceof Joi.ValidationError) {
          return { status: 'error', errors: e.details, data: rawRecord };
        }
        if (e instanceof ParseError || e instanceof AdapterError || e instanceof ImportError) {
          return { status: 'error', errors: [{ message: e.message }], data: rawRecord };
        }
        throw e;
      }
    }),
  );
}
