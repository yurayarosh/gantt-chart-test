import classNames from 'classnames';
import moment from 'moment';
import {
  FC,
  useEffect,
  useState,
  useMemo,
  PointerEvent,
  ChangeEvent,
  DragEvent,
  createRef,
  RefObject,
  useRef,
  MutableRefObject,
} from 'react';
import apiData from '../../api/data.json';
import { DAY_DURATION, MONTH_DURATION, seedDates, WEEK_DURATION } from '../../helpers';
import styles from './Chart.module.scss';

const COLUMN_WIDTH_SM = 40;
const COLUMN_WIDTH_LG = 150;

export enum ViewTypes {
  DAYS = 'days',
  MONTHS = 'months',
}

export type ViewType = ViewTypes.DAYS | ViewTypes.MONTHS;

interface ITask {
  name: string;
  start_date: string;
  end_date: string;
}

const Chart: FC = () => {
  const [viewType, setViewType] = useState<ViewType>(ViewTypes.DAYS);
  const [tasks, setTasks] = useState<ITask[] | null>(null);
  const [topDates, setTopDates] = useState<Date[]>([new Date()]);
  const [monthDurationOffset, setMonthDurationOffset] = useState(0);
  const [currentHintLeft, sethintsLeft] = useState([0]);
  const [tasksPositions, setTasksPositions] = useState([0]);
  const [tasksWidths, setTasksWidths] = useState([0]);
  const [tasksLefts, setTasksLefts] = useState([0]);

  const [freezeRangeChange, setFreezeRangeChange] = useState<boolean | null>(null);

  const wrapRef = useRef() as MutableRefObject<HTMLDivElement>;

  const tasksRefs = useMemo(() => {
    const refs: RefObject<HTMLDivElement>[] = [];
    if (tasks) {
      tasks.forEach((_, i) => {
        refs[i] = createRef();
      });
    }
    return refs;
  }, [tasks]);

  const initialDateRange = {
    max: new Date(Math.max(...apiData.map(t => new Date(t.end_date)).map(Number))),
    min: new Date(Math.min(...apiData.map(t => new Date(t.start_date)).map(Number))),
  };

  const dateRange = useMemo(() => {
    if (tasks) {
      const max = new Date(Math.max(...tasks.map(t => new Date(t.end_date)).map(Number)));
      const min = new Date(Math.min(...tasks.map(t => new Date(t.start_date)).map(Number)));

      return {
        min,
        max,
      };
    }

    return {
      min: new Date(),
      max: new Date(),
    };
  }, [tasks]);

  useEffect(() => {
    if (freezeRangeChange !== null) return;

    const startDate =
      viewType === ViewTypes.DAYS ? dateRange.min : moment(dateRange.min).startOf('month').toDate();

    const offset =
      viewType === ViewTypes.MONTHS
        ? dateRange.min.getTime() + MONTH_DURATION - startDate.getTime()
        : 0;

    setMonthDurationOffset(offset);
  }, [dateRange, viewType, freezeRangeChange]);

  const currentDayLineLeft = useMemo(() => {
    const leftDuration = new Date().getTime() - initialDateRange.min.getTime();
    const leftWidth =
      viewType === ViewTypes.DAYS
        ? (leftDuration + WEEK_DURATION) / DAY_DURATION
        : (leftDuration + monthDurationOffset) / MONTH_DURATION;

    return `calc(var(--column-width) * ${leftWidth})`;
  }, [dateRange, viewType, monthDurationOffset]);

  useEffect(() => {
    if (freezeRangeChange !== null) {
      return;
    }

    setTopDates(seedDates(dateRange.min, dateRange.max, viewType));
  }, [tasks, viewType, dateRange, freezeRangeChange]);

  const pxToMilisecondsIndex = useMemo(() => {
    const colWidth = viewType === ViewTypes.MONTHS ? COLUMN_WIDTH_LG : COLUMN_WIDTH_SM;

    const index =
      viewType === ViewTypes.MONTHS ? MONTH_DURATION / colWidth : DAY_DURATION / colWidth;

    return index;
  }, [viewType, topDates]);

  const onTaskDragStart = (i: number, pos: 'left' | 'right') => (e: DragEvent<HTMLSpanElement>) => {
    const widths = tasksWidths.concat();
    const positions = tasksPositions.concat();
    const lefts = tasksLefts.concat();

    const taskDiv = tasksRefs[i].current;

    const width = taskDiv?.offsetWidth;

    if (width) widths[i] = width;
    positions[i] = e.clientX;

    if (pos === 'left') {
      lefts[i] = taskDiv ? taskDiv.offsetLeft : 0;
    }

    setTasksWidths(widths);
    setTasksPositions(positions);
    if (pos === 'left') setTasksLefts(lefts);
  };

  const onTaskDrag = (i: number, pos: 'left' | 'right') => (e: DragEvent<HTMLSpanElement>) => {
    e.preventDefault();
    const taskDiv = tasksRefs[i].current;

    const posDiff = pos === 'left' ? tasksPositions[i] - e.clientX : e.clientX - tasksPositions[i];

    if (taskDiv) {
      taskDiv.style.width = `${tasksWidths[i] + posDiff}px`;
    }

    if (pos === 'left' && taskDiv) {
      taskDiv.style.left = `${tasksLefts[i] - posDiff}px`;
    }
  };

  const onTaskDragEnd = (i: number, pos: 'left' | 'right') => (e: DragEvent<HTMLSpanElement>) => {
    const taskDiv = tasksRefs[i].current;
    const posDiff = pos === 'left' ? tasksPositions[i] - e.clientX : e.clientX - tasksPositions[i];

    if (taskDiv) taskDiv.style.width = `${tasksWidths[i] + posDiff}px`;
    if (pos === 'left' && taskDiv) {
      taskDiv.style.left = `${tasksLefts[i] - posDiff}px`;
    }

    if (tasks) {
      const currTask = tasks[i];

      const diffDuration = posDiff * pxToMilisecondsIndex;
      const updDate =
        pos === 'left'
          ? new Date(new Date(currTask.start_date).getTime() - diffDuration)
          : new Date(new Date(currTask.end_date).getTime() + diffDuration);

      const updatedTasks = tasks?.map(task =>
        task.name === currTask.name
          ? {
              ...task,
              ...(pos === 'left' ? { start_date: moment(updDate).format('MM/DD/YYYY HH:mm') } : {}),
              ...(pos === 'right' ? { end_date: moment(updDate).format('MM/DD/YYYY HH:mm') } : {}),
            }
          : { ...task }
      );

      setTasks(updatedTasks);
      setFreezeRangeChange(true);

      setTimeout(() => setFreezeRangeChange(false), 500);
    }
  };

  const onTaskPointerEnter = (i: number) => (e: PointerEvent<HTMLSpanElement>) => {
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
    const lefts = currentHintLeft.concat();

    lefts[i] = x;
    sethintsLeft(lefts);
  };

  const onTaskPointerLeave = (i: number) => () => {
    const lefts = currentHintLeft.concat();
    lefts[i] = 0;
    sethintsLeft(lefts);
  };

  useEffect(() => {
    setFreezeRangeChange(null);
    setTasks(apiData);
  }, [viewType]);

  return (
    <div className={styles.wrap} data-view={viewType} ref={wrapRef}>
      <div className="left">
        <div className="top">
          <select
            value={viewType}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setViewType(e.target.value as ViewType)
            }
          >
            <option value={ViewTypes.DAYS}>Days</option>
            <option value={ViewTypes.MONTHS}>Months</option>
          </select>
        </div>

        <ul>{tasks && tasks.map(task => <li key={task.name}>{task.name}</li>)}</ul>
      </div>

      <div className="right">
        <div className="top">
          <ul>
            {topDates.map(date => (
              <li
                key={date.getTime()}
                className={classNames({
                  'is-saturday': viewType === ViewTypes.DAYS && moment(date).format('d') === '6',
                  'is-sunday': viewType === ViewTypes.DAYS && moment(date).format('d') === '0',
                })}
                data-week={`${moment(date).startOf('isoWeek').format('MMMM DD')} - ${moment(date)
                  .endOf('isoWeek')
                  .format('MMMM DD')}`}
              >
                <span>
                  {viewType === ViewTypes.DAYS
                    ? moment(date).format('DD')
                    : moment(date).format('MMMM')}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.table}>
          {tasks &&
            tasks.map((task, i) => {
              const taskDates = topDates.filter(
                date => new Date(task.start_date) <= date && new Date(task.end_date) >= date
              );

              const taskDateStart = topDates.find(
                date =>
                  moment(date).format('DD/MM') === moment(new Date(task.start_date)).format('DD/MM')
              );

              const startIndex = taskDateStart && topDates.indexOf(taskDateStart);

              const taskDutration =
                new Date(task.end_date).getTime() - new Date(task.start_date).getTime();

              const taskWidth = taskDutration / MONTH_DURATION;
              const taskLeftDuration =
                new Date(task.start_date).getTime() - initialDateRange.min.getTime();
              const taskLeftWidth = (taskLeftDuration + monthDurationOffset) / MONTH_DURATION;

              const width =
                viewType === ViewTypes.DAYS
                  ? `calc(var(--column-width) * ${taskDates.length})`
                  : `calc(var(--column-width) * ${taskWidth})`;
              const left =
                viewType === ViewTypes.DAYS
                  ? `calc(var(--column-width) * ${startIndex})`
                  : `calc(var(--column-width) * ${taskLeftWidth})`;

              return (
                <div
                  key={task.name}
                  ref={tasksRefs[i]}
                  className={classNames('task')}
                  title={task.name}
                  style={{
                    width,
                    left,
                  }}
                  onPointerEnter={onTaskPointerEnter(i)}
                  onPointerLeave={onTaskPointerLeave(i)}
                >
                  <span>{task.name}</span>

                  <div className="hint" style={{ left: `${currentHintLeft[i]}px` }}>
                    {task.start_date} - {task.end_date},{' '}
                    {Math.floor(
                      (new Date(task.end_date).getTime() - new Date(task.start_date).getTime()) /
                        1000 /
                        60 /
                        60 /
                        24
                    )}{' '}
                    days
                  </div>

                  <span
                    className="drag is-left"
                    draggable={true}
                    onDragStart={onTaskDragStart(i, 'left')}
                    onDrag={onTaskDrag(i, 'left')}
                    onDragEnd={onTaskDragEnd(i, 'left')}
                  />
                  <span
                    className="drag is-right"
                    draggable={true}
                    onDragStart={onTaskDragStart(i, 'right')}
                    onDrag={onTaskDrag(i, 'right')}
                    onDragEnd={onTaskDragEnd(i, 'right')}
                  />
                </div>
              );
            })}

          <table>
            <tbody>
              {tasks &&
                tasks.map(task => (
                  <tr key={task.name}>
                    {topDates.map(date => (
                      <td key={date.getTime()}>&nbsp;</td>
                    ))}
                  </tr>
                ))}
            </tbody>
          </table>

          <div className={styles.line} style={{ left: currentDayLineLeft }}>
            <div className="hint">{moment().format('YYYY/MM/DD')}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chart;
