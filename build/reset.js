"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const filePath = path_1.default.join(__dirname, 'endpoints.json');
try {
    fs_1.default.unlinkSync(filePath);
}
catch (err) {
    console.log('file does not exists');
}
fs_1.default.writeFileSync(filePath, '[]');
console.log('Unlinked...');
