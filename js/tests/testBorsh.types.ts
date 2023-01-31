interface IPurchase {
    purchase_id: string;
    name: string;
    price: number;
    date: string;
};
interface IPerson {
    person_id: string;
    first_name: string;
    last_name: string;
    purchases: IPurchase[];
};

export class PurchaseStruct implements IPurchase {
    purchase_id: string;
    name: string;
    price: number;
    date: string;
    constructor(fields: IPurchase) {
        Object.assign(this, fields);
    };
};

export class PersonStruct implements IPerson {
    person_id: string;
    first_name: string;
    last_name: string;
    purchases: IPurchase[];
    constructor(fields: IPerson) {
        Object.assign(this, fields);
    }
};

export const PersonSchema = new Map<any, any>([
    [
        PersonStruct, {
            kind: 'struct',
            fields: [
                ['person_id', 'string'],
                ['first_name', 'string'],
                ['last_name', 'string'],
                ['purchases', [PurchaseStruct]],
            ]
        }
    ],
    [
        PurchaseStruct, {
            kind: 'struct',
            fields: [
                ['purchase_id', 'string'],
                ['name', 'string'],
                ['price', 'u32'],
                ['date', 'string'],
            ]
        }
    ]
]);