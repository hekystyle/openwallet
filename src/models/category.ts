import { Model, Schema } from 'mongoose';

export interface Category {
  name: string;
}

export function isCategory(val: any): val is Category {
  return (
    val !== null
    && typeof val === 'object'
    && typeof val.name === 'string'
  );
}

export const categorySchema = new Schema<Category>({
  name: { type: String, required: true },
});

export type CategoryModel = Model<Category>;
