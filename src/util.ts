import { DataFrame, DataQueryResponseData, FieldType, guessFieldTypeForField, toDataFrame } from '@grafana/data';
import { isArray, isFinite, first } from 'lodash';

export function getColorForValue(data: any, value: number) {
  if (!isFinite(value)) {
    return null;
  }

  for (let i = data.thresholds.length; i > 0; i--) {
    if (value >= data.thresholds[i - 1]) {
      return data.colorMap[i];
    }
  }

  return first(data.colorMap);
}

/**
 * All panels will be passed tables that have our best guess at column type set
 *
 * This is also used by PanelChrome for snapshot support
 */
export function getProcessedDataFrames(results?: DataQueryResponseData[]): DataFrame[] {
  if (!results || !isArray(results)) {
    return [];
  }

  const dataFrames: DataFrame[] = [];

  for (const result of results) {
    const dataFrame = guessFieldTypes(toDataFrame(result));

    if (dataFrame.fields && dataFrame.fields.length) {
      // clear out the cached info
      for (const field of dataFrame.fields) {
        field.state = null;
      }
    }

    dataFrames.push(dataFrame);
  }

  return dataFrames;
}

/**
 * @returns A copy of the series with the best guess for each field type.
 * If the series already has field types defined, they will be used, unless `guessDefined` is true.
 * @param series The DataFrame whose field's types should be guessed
 * @param guessDefined Whether to guess types of fields with already defined types
 */
export const guessFieldTypes = (series: DataFrame, guessDefined = false): DataFrame => {
  for (const field of series.fields) {
    if (!field.type || field.type === FieldType.other || guessDefined) {
      // Something is missing a type, return a modified copy
      return {
        ...series,
        fields: series.fields.map((field) => {
          if (field.type && field.type !== FieldType.other && !guessDefined) {
            return field;
          }
          // Calculate a reasonable schema value
          return {
            ...field,
            type: guessFieldTypeForField(field) || FieldType.other,
          };
        }),
      };
    }
  }
  // No changes necessary
  return series;
};
