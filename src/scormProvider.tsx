"use client"
import SCORM, { debug } from 'scorm-wrapper'
import React from 'react';
import autobind from 'auto-bind';


// types
export type ScormProviderProps = {
    version: string;
    debug?: boolean;
    children: React.ReactNode;
};

type ScormProviderState = {
    apiConnected: boolean;
    learnerName: string;
    completionStatus: string;
    suspendData: any;
    scormVersion: string;
};

/////////////////////////////////////////////////////
type ScoContextType = {
    scormState: ScormProviderState;
    getSuspendData: () => Promise<any>;
    setSuspendData: (key: string, val: any) => Promise<any>;
    clearSuspendData: () => Promise<any>;
    setStatus: (status: string, deferSaveCall?: boolean) => Promise<any>;
    setScore: (scoreObj: any) => Promise<any>;
    set: (param: string, val: any, deferSaveCall?: boolean) => Promise<[string, any]>;
    get: (param: string) => any;
};

// context

export const ScoContext = React.createContext<ScoContextType>({
    scormState: {
        apiConnected: false,
        learnerName: '',
        completionStatus: 'unknown',
        suspendData: {},
        scormVersion: ''
    },
    getSuspendData: async () => Promise.resolve({}),
    setSuspendData: async () => Promise.resolve({}),
    clearSuspendData: async () => Promise.resolve({}),
    setStatus: async () => Promise.resolve({}),
    setScore: async () => Promise.resolve({}),
    set: async () => ['', ''],
    get: () => {}
});

// provider

class ScormProvider extends React.Component<ScormProviderProps, ScormProviderState> {
    constructor(props: ScormProviderProps) {
        super(props);

        // this state will be passed in 'sco' to consumers
        this.state = {
            apiConnected: false,
            learnerName: '',
            completionStatus: 'unknown',
            suspendData: {},
            scormVersion: ''
        };

        autobind(this);
    }

    componentDidMount(): void {
        this.createScormAPIConnection();
        window.addEventListener('beforeunload', this.closeScormAPIConnection);
    }

    componentWillUnmount(): void {
        this.closeScormAPIConnection();
        window.removeEventListener('beforeunload', this.closeScormAPIConnection);
    }

    createScormAPIConnection(): void{
        // if connection is already open, do nothing
        if (this.state.apiConnected) return;
        SCORM.SCORM.version = this.props.version;
        if (this.props.debug  && typeof this.props.debug === 'boolean')
        {
            console.log('------ ScormProvider debug mode is on ------------ ')
            debug.isActive = this.props.debug;
        }
        let scorm = SCORM.init();
        if (!scorm) {
            setTimeout(() => {
                scorm = SCORM.init();
            }, 1000);
        }
        if (scorm) {
            const version = SCORM.SCORM.version;
            const learnerName =
                version === '1.2' ? SCORM.get('cmi.core.student_name') : SCORM.get('cmi.learner_name');
            const completionStatus = SCORM.status('get');
            this.setState(
                {
                    apiConnected: true,
                    learnerName: learnerName,
                    completionStatus: completionStatus,
                    scormVersion: version
                },
                () => {
                    this.getSuspendData();
                }
            );
        } else {
            // could not create the SCORM API connection
            if (this.props.debug) console.error('ScormProvider init error: could not create the SCORM API connection');
        }
    }

    closeScormAPIConnection(): void {
        // if connection is not open, do nothing
        if (!this.state.apiConnected) return;

        this.setSuspendData();
        SCORM.status('set', this.state.completionStatus);
        SCORM.save();
        const success = SCORM.quit();
        if (success) {
            this.setState({
                apiConnected: false,
                learnerName: '',
                completionStatus: 'unknown',
                suspendData: {},
                scormVersion: ''
            });
        } else {
            // could not close the SCORM API connection
            if (this.props.debug) console.error('ScormProvider error: could not close the API connection');
        }
    }

    getSuspendData(): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.state.apiConnected) return reject('SCORM API not connected');

            const data = SCORM.get('cmi.suspend_data');
            const suspendData = data && data.length > 0 ? JSON.parse(data) : {};
            this.setState(
                {
                    suspendData: suspendData
                },
                () => {
                    return resolve(this.state.suspendData);
                }
            );
        });
    }

    setSuspendData(key?: string, val?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.state.apiConnected) return reject('SCORM API not connected');

            let currentData = { ...this.state.suspendData } || {};
            if (key && val) currentData[key] = val;
            const success = SCORM.set('cmi.suspend_data', JSON.stringify(currentData));
            if (!success) return reject('could not set the suspend data provided');
            this.setState(
                {
                    suspendData: currentData
                },
                () => {
                    SCORM.save();
                    return resolve(this.state.suspendData);
                }
            );
        });
    }

    clearSuspendData(): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.state.apiConnected) return reject('SCORM API not connected');

            const success = SCORM.set('cmi.suspend_data', JSON.stringify({}));
            if (!success) return reject('could not clear suspend data');
            this.setState(
                {
                    suspendData: {}
                },
                () => {
                    SCORM.save();
                    return resolve(this.state.suspendData);
                }
            );
        });
    }

    setStatus(status: string, deferSaveCall?: boolean): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.state.apiConnected) return reject('SCORM API not connected');

            const validStatuses = ['passed', 'completed', 'failed', 'incomplete', 'browsed', 'not attempted', 'unknown'];
            if (!validStatuses.includes(status)) {
                if (this.props.debug) console.error('ScormProvider setStatus error: could not set the status provided');
                return reject('could not set the status provided');
            }
            const success = SCORM.status('set', status);
            if (!success) return reject('could not set the status provided');
            this.setState(
                {
                    completionStatus: status
                },
                () => {
                    if (!deferSaveCall) SCORM.save();
                    return resolve(this.state.completionStatus);
                }
            );
        });
    }

    setScore(scoreObj: { value?: number; min?: number; max?: number; status?: string }): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.state.apiConnected) return reject('SCORM API not connected');

            const { value, min, max, status } = scoreObj;
            const coreStr = this.state.scormVersion === '1.2' ? '.core' : '';
            const promiseArr: any = [];
            if (typeof value === 'number') promiseArr.push(this.set(`cmi${coreStr}.score.raw`, value, true));
            if (typeof min === 'number') promiseArr.push(this.set(`cmi${coreStr}.score.min`, min, true));
            if (typeof max === 'number') promiseArr.push(this.set(`cmi${coreStr}.score.max`, max, true));
            if (typeof status === 'string') promiseArr.push(this.setStatus(status, true));

            Promise.all(promiseArr)
                .then(values => {
                    SCORM.save();
                    return resolve(values);
                })
                .catch(err => {
                    return reject('could not save the score object provided');
                });
        });
    }

    async set(param: string, val: any, deferSaveCall?: boolean): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!this.state.apiConnected) return reject('SCORM API not connected');

            const success = SCORM.set(param, val);
            if (!success) return reject(`could not set: { ${param}: ${val} }`);
            if (!deferSaveCall) SCORM.save();
            return resolve([param, val]);
        });
    }

    get(param: string): any {
        if (!this.state.apiConnected) return;
        return SCORM.get(param);
    }

    render(): JSX.Element {
        const val = {
            scormState: this.state,
            getSuspendData: this.getSuspendData,
            setSuspendData: this.setSuspendData,
            clearSuspendData: this.clearSuspendData,
            setStatus: this.setStatus,
            setScore: this.setScore,
            set: this.set,
            get: this.get
        };

        return <ScoContext.Provider value={val}>{this.props.children}</ScoContext.Provider>;
    }
}

export default ScormProvider;