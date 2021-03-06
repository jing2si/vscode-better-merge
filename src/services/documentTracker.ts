import * as vscode from 'vscode';
import { MergeConflictParser } from './mergeConflictParser';
import * as interfaces from './interfaces';
import { Delayer } from '../delayer';

export default class DocumentMergeConflictTracker implements vscode.Disposable, interfaces.IDocumentMergeConflictTracker {

    private cache: Map<string, Delayer<interfaces.IDocumentMergeConflict[]>> = new Map();
    private delayExpireTime: number = 150;

    getConflicts(document: vscode.TextDocument): PromiseLike<interfaces.IDocumentMergeConflict[]> {
        // Attempt from cache

        let key = this.getCacheKey(document);

        if (!key) {
            // Document doesnt have a uri, can't cache it, so return
            return Promise.resolve(this.getConflictsOrEmpty(document));
        }

        let cacheItem: Delayer<interfaces.IDocumentMergeConflict[]> = this.cache.get(key);
        if(!cacheItem) {
            cacheItem = new Delayer<interfaces.IDocumentMergeConflict[]>(this.delayExpireTime);
            this.cache.set(key, cacheItem);
        }

        return cacheItem.trigger(() => {
            let conflicts = this.getConflictsOrEmpty(document);

            if(this.cache) {
                this.cache.delete(key);
            }

            return conflicts;
        });
    }

    forget(document: vscode.TextDocument) {
        let key = this.getCacheKey(document);

        if (key) {
            this.cache.delete(key);
        }
    }

    dispose() {
        if (this.cache) {
            this.cache.clear();
            this.cache = null;
        }
    }

    private getConflictsOrEmpty(document : vscode.TextDocument) : interfaces.IDocumentMergeConflict[] {
        return MergeConflictParser.containsConflict(document) ? MergeConflictParser.scanDocument(document) : [];
    }

    private getCacheKey(document: vscode.TextDocument) {
        if (document.uri && document.uri) {
            return document.uri.toString();
        }

        return null;
    }
}