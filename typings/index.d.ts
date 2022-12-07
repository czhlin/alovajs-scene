import { Alova, Method, RequestHookConfig, UseHookReturnType, WatcherHookConfig } from 'alova';

/** 判断是否为any */
type IsAny<T, P, N> = 0 extends 1 & T ? P : N;

/** 判断是否为unknown */
type IsUnknown<T, P, N> = 1 extends 1 & T ? P : N;

/** @description usePagination相关 */
type ArgGetter<R, LD> = (data: R) => LD | undefined;
interface PaginationConfig<R, LD, WS> {
	preloadPreviousPage?: boolean;
	preloadNextPage?: boolean;
	pageCount?: ArgGetter<R, number>;
	total?: ArgGetter<R, number>;
	data?: ArgGetter<R, LD>;
	initialData?: WatcherHookConfig['initialData'];
	append?: boolean;
	initialPage?: number;
	initialPageSize?: number;
	debounce?: WatcherHookConfig['debounce'];
	watchingStates?: WS;
}
interface InsertConfig {
	index?: number;
	onAfter?: () => void;
	onBefore?: () => void;
}

// =========================
// 静默队列hooks相关
type SQHookBehavior = 'static' | 'queue' | 'silent' | (() => 'static' | 'queue' | 'silent');
interface SQHookConfig {
	/**
	 * hook行为，可选值为silent、queue、static，默认为queue
	 * 可以设置为可选值，或一个带返回可选值的回调函数
	 * silent：静默提交，方法实例会进入队列并持久化，然后立即触发onSuccess
	 * queue: 队列请求，方法实例会进入队列但不持久化，onSuccess、onError正常触发
	 * static：静态请求，和普通的useRequest一样
	 *
	 * 场景1. 手动开关
	 * 场景2. 网络状态不好时回退到static，网络状态自行判断
	 */
	behavior?: SQHookBehavior;

	/** 重试次数 */
	retry?: number;

	/**
	 * 请求超时时间
	 * 当达到超时时间后仍未响应则再次发送请求
	 * 单位毫秒
	 */
	timeout?: number;

	/**
	 * 失败后下一轮重试的时间，单位毫秒
	 * 如果不指定，则在下次刷新时再次触发
	 */
	nextRound?: number;

	/** 队列名，不传时选择默认队列 */
	queue?: string;
}
type SQRequestHookConfig<S, E, R, T, RC, RE, RH> = SQHookConfig &
	Omit<RequestHookConfig<S, E, R, T, RC, RE, RH>, 'middleware'>;
type SQWatcherHookConfig<S, E, R, T, RC, RE, RH> = SQHookConfig &
	Omit<WatcherHookConfig<S, E, R, T, RC, RE, RH>, 'middleware'>;

type FallbackHandler = (...args: any[]) => void;
type BeforePushQueueHandler = (...args: any[]) => void;
type PushedQueueHandler = (...args: any[]) => void;
type SQHookReturnType<R, S> = UseHookReturnType<R, S> & {
	/**
	 * 回退事件绑定函数，它将在以下情况触发：
	 * 1. 重试指定次数都无响应而停止继续请求后
	 * 2. 因断网、服务端相应错误而停止请求后
	 *
	 * 绑定此事件后，请求持久化将失效，这意味着刷新即丢失静默提交的项
	 * 它只在silent行为下有效
	 *
	 * 和onComplete事件对比：
	 * 1. 只在重试次数达到后仍然失败时触发
	 * 2. 在onComplete之前触发
	 */
	onFallback: (handler: FallbackHandler) => void;

	/** 在入队列前调用，在此可以过滤队列中重复的SilentMethod，在static行为下无效 */
	onBeforePushQueue: (handler: BeforePushQueueHandler) => void;

	/** 在入队列后调用，在static行为下无效 */
	onPushedQueue: (handler: PushedQueueHandler) => void;
};

/** 静默方法实例匹配器 */
type SilentMethodFilter =
	| string
	| RegExp
	| {
			name: string | RegExp;
			filter: (method: SilentMethod, index: number, methods: SilentMethod[]) => boolean;
	  };

interface DataSerializer {
	forward: (data: any) => any | undefined | void;
	backward: (data: any) => any | undefined | void;
}

/** SilentFactory启动选项 */
interface SilentFactoryBootOptions {
	/**
	 * silentMethod依赖的alova实例
	 * alova实例的存储适配器、请求适配器等将用于存取SilentMethod实例，以及发送静默提交
	 */
	alova: Alova<any, any, any, any, any>;

	/** 延迟毫秒数，不传时默认延迟2000ms */
	delay?: number;

	/**
	 * 序列化器集合，用于自定义转换为序列化时某些不能直接转换的数据
	 * 集合的key作为它的名字进行序列化，当反序列化时会将对应名字的值传入backward函数中
	 * 因此，在forward中序列化时需判断是否为指定的数据，并返回转换后的数据，否则返回undefined或不返回
	 * 而在backward中可通过名字来识别，因此只需直接反序列化即可
	 * 内置的序列化器：
	 * 1. date序列化器用于转换日期
	 * 2. regexp序列化器用于转化正则表达式
	 *
	 * >>> 可以通过设置同名序列化器来覆盖内置序列化器
	 */
	serializer?: Record<string | number, DataSerializer>;
}

/** 静默提交事件 */
interface SilentSubmitEvent {
	/** 当前的method实例 */
	method: Method;

	/** 是否成功 */
	success: boolean;

	/** 已重试的次数 */
	retriedTimes: number;

	/** 失败时抛出的错误，只在失败时有值 */
	error?: any;
}
type SilentSubmitBootHandler = () => void;
type SilentSubmitSuccessHandler = (event: SilentSubmitEvent) => void;
type SilentSubmitErrorHandler = (event: SilentSubmitEvent) => void;
type SilentSubmitCompleteHandler = (event: SilentSubmitEvent) => void;

// ************ 导出类型 ***************
declare function bootSilentFactory(options: SilentFactoryBootOptions): void;
declare function onSilentSubmitBoot(handler: SilentSubmitBootHandler): void;
declare function onSilentSubmitSuccess(handler: SilentSubmitSuccessHandler<R>): void;
declare function onSilentSubmitError(handler: SilentSubmitErrorHandler): void;
declare function onSilentSubmitComplete(handler: SilentSubmitCompleteHandler): void;
