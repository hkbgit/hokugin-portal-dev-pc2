#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import re

# 以下の値を設定すること
# DB設定
# 接続先ホスト
set_host = 'localhost'
# ユーザー
set_user = 'root'
# パスワード
set_password = ''
# database名
set_database = 'hokuriku'

# 以下は変更しないこと
DB_SETTINGS_TOBE = '''
      DEBUG: {{
        HOST: '{host}',
        USER: '{user}',
        PASSWORD: '{password}',
        DATABASE: '{database}'
      }}
'''.format(host = set_host, user = set_user, password = set_password, database = set_database)[1:-1]
DB_SETTINGS_ORIGIN = r'''
      DEBUG: \{
        HOST: '.*?',
        USER: '.*?',
        PASSWORD: '.*?',
        DATABASE: '.*?'
      \}
'''[1:-1]

if  __name__ == '__main__':
    args = sys.argv
    if (len(args) != 2):
        print ('引数不正です')
        sys.exit(1)
    filepath = args[1]
    replacement = None
    try:
        with open(filepath, 'r+') as f:
            data = f.read()
            # DB設定変更
            replacement = re.sub(DB_SETTINGS_ORIGIN, DB_SETTINGS_TOBE, data)
        with open(filepath, 'w') as f:
            f.write(replacement)
            print('ファイル内容を書き換えました')
            sys.exit(0)
    except IOError as e:
        print('ファイルオープンに失敗しました')
        sys.exit(1)
