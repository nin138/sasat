type ContextConditionValue = {
  kind: 'context';
  field: string;
  onNotDefined: OnNotDefinedAction;
};

type FixedConditionValue = {
  kind: 'fixed';
  value: string | number;
};

type TodayStartConditionValue = {
  kind: 'today';
  type: 'date' | 'datetime';
  thresholdHour?: number;
};

type NowConditionValue = {
  kind: 'now';
};

type OnNotDefinedAction =
  | {
      action: 'error';
      message: string;
    }
  | {
      action: 'defaultValue';
      value: string | number;
    };

export type ConditionValue =
  | ContextConditionValue
  | FixedConditionValue
  | TodayStartConditionValue
  | NowConditionValue;
